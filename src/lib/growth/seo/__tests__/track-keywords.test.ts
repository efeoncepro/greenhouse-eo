import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1308 Slice 0 — command `trackKeywords`.
 *
 * El foco de esta suite NO es "¿inserta?": es el contrato de **gasto diferido**. Seguir una
 * keyword hace que el rank capture diario (TASK-1303) pague DataForSEO por ella todos los
 * días, así que lo que hay que probar es el techo, la idempotencia, la normalización y que
 * ningún rechazo ocurra en silencio.
 *
 * El SQL (índice único parcial, `FOR UPDATE OF`, `UNNEST`, upsert del set) se ejercita
 * contra PG real en `scripts/growth/_sanity-task-1308-track-keywords.ts` — gate TASK-893:
 * los mocks ejercitan el TS, NUNCA el SQL.
 */

vi.mock('server-only', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  moduleEnabled: true,
  target: [{ organization_id: 'org-1', status: 'active' }] as Array<Record<string, unknown>>,
  hasModule: true,
  activeKeywords: [] as string[],
  /** TASK-1659 — intención vigente por keyword; ausente = `NULL` (nadie la declaró). */
  activeIntents: {} as Record<string, string | null>,
  insertRowCount: null as number | null,
  calls: [] as QueryCall[],
  outboxEvents: [] as Array<Record<string, unknown>>,
  thrown: null as Error | null,
  captured: [] as unknown[]
}

/**
 * El array de keywords es el ÚLTIMO parámetro de ambos INSERT y del UPDATE de reapertura.
 * Buscarlo por forma en vez de por índice fijo evita que la suite se rompa —o peor, quede
 * verde midiendo el parámetro equivocado— cada vez que el command agrega una columna.
 */
const keywordsParam = (params: unknown[]): string[] =>
  (params.filter(param => Array.isArray(param)).at(-1) as string[] | undefined) ?? []

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    state.calls.push({ sql, params })
    if (state.thrown) throw state.thrown

    return state.target
  }
}))

vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (client: unknown) => Promise<unknown>) =>
    callback({
      query: async (sql: string, params: unknown[]) => {
        state.calls.push({ sql, params })

        if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_sets')) {
          return { rows: [{ keyword_set_id: 'seoks-1' }], rowCount: 1 }
        }

        if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) {
          return {
            rows: state.activeKeywords.map(keyword => ({
              keyword,
              intent: state.activeIntents[keyword] ?? null
            })),
            rowCount: state.activeKeywords.length
          }
        }

        if (sql.includes('UPDATE greenhouse_growth.seo_keyword_set_members')) {
          const asked = params[1] as string[]
          const closed = asked.filter(k => state.activeKeywords.includes(k))

          return { rows: closed.map(keyword => ({ keyword })), rowCount: closed.length }
        }

        if (sql.includes('SELECT COUNT(*)::text AS n')) {
          return { rows: [{ n: String(state.activeKeywords.length) }], rowCount: 1 }
        }

        if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')) {
          const inserted = keywordsParam(params).length

          return { rows: [], rowCount: state.insertRowCount ?? inserted }
        }

        return { rows: [], rowCount: 0 }
      }
    })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: Record<string, unknown>) => {
    state.outboxEvents.push(event)

    return 'outbox-test'
  }
}))

vi.mock('../entitlement', () => ({
  resolveSeoEntitlement: async () => ({ hasModule: state.hasModule })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (error: unknown) => {
    state.captured.push(error)
  }
}))

import {
  normalizeTrackedKeyword,
  TRACKED_KEYWORDS_CAPACITY_ENV,
  trackKeywords,
  untrackKeywords
} from '../track-keywords'

const ENV_ON = { GROWTH_SEO_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv

const envWithCapacity = (capacity: number) =>
  ({ GROWTH_SEO_ENABLED: 'true', [TRACKED_KEYWORDS_CAPACITY_ENV]: String(capacity) }) as unknown as NodeJS.ProcessEnv

const statusOf = (outcomes: Array<{ keyword: string; status: string }>, keyword: string) =>
  outcomes.find(outcome => outcome.keyword === keyword)?.status

beforeEach(() => {
  state.moduleEnabled = true
  state.target = [{ organization_id: 'org-1', status: 'active' }]
  state.hasModule = true
  state.activeKeywords = []
  state.activeIntents = {}
  state.insertRowCount = null
  state.calls = []
  state.outboxEvents = []
  state.thrown = null
  state.captured = []
})

describe('trackKeywords — puertas de acceso', () => {
  it('con el módulo apagado no toca la base', async () => {
    const result = await trackKeywords('seot-1', ['berel'], 'user-1', {
      env: {} as unknown as NodeJS.ProcessEnv
    })

    expect(result).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(state.calls).toHaveLength(0)
  })

  it('degrada cuando el target no existe', async () => {
    state.target = []

    const result = await trackKeywords('seot-missing', ['berel'], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'target_not_found', status: null })
  })

  it('un target pausado no puede crecer su set', async () => {
    state.target = [{ organization_id: 'org-1', status: 'paused' }]

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'target_not_active', status: null })
  })

  it('sin module_assignment vigente el target no existe para el command', async () => {
    state.hasModule = false

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'no_entitlement', status: null })
  })

  it('un lote vacío o sólo con basura no llega a la base', async () => {
    const result = await trackKeywords('seot-1', ['   ', ''], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'no_keywords', status: null })
    expect(state.calls).toHaveLength(0)
  })
})

describe('trackKeywords — normalización', () => {
  it('colapsa espacios, recorta y baja a minúscula', () => {
    expect(normalizeTrackedKeyword('  Pintura   BEREL ')).toBe('pintura berel')
  })

  it('dedupe dentro del lote: la misma keyword no produce dos outcomes', async () => {
    const result = await trackKeywords('seot-1', ['Berel', 'berel', ' BEREL '], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes).toHaveLength(1)
    expect(result.outcomes[0]).toEqual({ keyword: 'berel', status: 'tracked' })
  })

  it('una keyword más larga que el máximo se marca invalid, no se persiste', async () => {
    const result = await trackKeywords('seot-1', ['a'.repeat(256), 'berel'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes.some(outcome => outcome.status === 'invalid')).toBe(true)
    expect(statusOf(result.outcomes, 'berel')).toBe('tracked')
  })
})

describe('trackKeywords — idempotencia y techo de gasto diferido', () => {
  it('una keyword ya vigente no genera write ni evento', async () => {
    state.activeKeywords = ['berel']

    const result = await trackKeywords('seot-1', ['Berel'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes[0].status).toBe('already_tracked')
    expect(state.calls.some(call => call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members'))).toBe(
      false
    )
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('el techo se evalúa contra el conteo proyectado: llena los cupos libres y rebota el resto', async () => {
    state.activeKeywords = ['ya-1', 'ya-2']

    const result = await trackKeywords('seot-1', ['nueva-a', 'nueva-b', 'nueva-c'], 'user-1', {
      env: envWithCapacity(4)
    })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(statusOf(result.outcomes, 'nueva-a')).toBe('tracked')
    expect(statusOf(result.outcomes, 'nueva-b')).toBe('tracked')
    // El tercero se pasa del techo de 4 (2 vigentes + 2 nuevas) y se RECHAZA explícito.
    expect(statusOf(result.outcomes, 'nueva-c')).toBe('capacity_exceeded')
    expect(result.activeKeywordCount).toBe(4)
    expect(result.capacity).toBe(4)
  })

  it('el rechazo por techo nunca es una excepción ni un silencio', async () => {
    state.activeKeywords = ['ya-1']

    const result = await trackKeywords('seot-1', ['nueva-a'], 'user-1', { env: envWithCapacity(1) })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes).toEqual([{ keyword: 'nueva-a', status: 'capacity_exceeded' }])
    expect(state.calls.some(call => call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members'))).toBe(
      false
    )
  })
})

describe('trackKeywords — persistencia y evento', () => {
  it('persiste procedencia (actor + source) junto a la keyword', async () => {
    await trackKeywords('seot-1', ['berel'], 'user-42', { env: ENV_ON, source: 'nexa' })

    const insert = state.calls.find(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')
    )

    expect(insert).toBeDefined()
    expect(insert?.params[1]).toBe('user-42')
    expect(insert?.params[2]).toBe('nexa')
    expect(keywordsParam(insert?.params ?? [])).toEqual(['berel'])
  })

  it('sin intención declarada persiste NULL, no `opportunity` (no inventa el hecho)', async () => {
    await trackKeywords('seot-1', ['berel'], 'user-42', { env: ENV_ON })

    const insert = state.calls.find(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')
    )

    // params: [setId, actor, source, intent, intentDeclaredBy, keywords]
    expect(insert?.params[3]).toBeNull()
    expect(insert?.params[4]).toBeNull()
  })

  it('emite el evento outbox con coordenadas, no con los datos', async () => {
    await trackKeywords('seot-1', ['berel', 'pintura berel'], 'user-1', { env: ENV_ON })

    expect(state.outboxEvents).toHaveLength(1)

    const event = state.outboxEvents[0] as { eventType: string; aggregateId: string; payload: Record<string, unknown> }

    expect(event.eventType).toBe('growth.seo.keyword_set.updated')
    expect(event.aggregateId).toBe('seot-1')
    expect(event.payload).toMatchObject({
      seoTargetId: 'seot-1',
      organizationId: 'org-1',
      keywordSetId: 'seoks-1',
      trackedCount: 2,
      actor: 'user-1'
    })
    // Coordenadas, no datos: las keywords NO viajan en el payload.
    expect(JSON.stringify(event.payload)).not.toContain('pintura berel')
  })

  it('si el INSERT rebota entero por carrera, no se emite evento', async () => {
    state.insertRowCount = 0

    await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(state.outboxEvents).toHaveLength(0)
  })

  it('una falla de base degrada al contrato, no propaga la excepción', async () => {
    state.thrown = new Error('boom')

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'query_failed', status: null })
    expect(state.captured).toHaveLength(1)
  })
})

/**
 * TASK-1659 — la intención declarada.
 *
 * Lo que se prueba acá NO es "¿guarda la columna?": es que la distinción entre un compromiso
 * con el cliente y una oportunidad detectada no se pueda perder ni inventar. Dos invariantes
 * cargan todo el peso: no se asume intención cuando nadie la declaró, y cambiarla historia la
 * anterior en vez de sobrescribirla.
 *
 * El SQL real del cierre+reapertura contra el índice único parcial se ejercita en
 * `scripts/growth/_sanity-task-1659-keyword-intent.ts` — los mocks no lo cubren.
 */
describe('trackKeywords — intención declarada (TASK-1659)', () => {
  it('persiste intención y autoría cuando se declara', async () => {
    await trackKeywords('seot-1', ['berel'], 'user-42', { env: ENV_ON, intent: 'target' })

    const insert = state.calls.find(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')
    )

    expect(insert?.params[3]).toBe('target')
    expect(insert?.params[4]).toBe('user-42')
  })

  it('el autor del compromiso puede diferir de quien ejecuta el INSERT', async () => {
    await trackKeywords('seot-1', ['berel'], 'mcp:agent-7', {
      env: ENV_ON,
      source: 'mcp',
      intent: 'target',
      intentDeclaredBy: 'user-42'
    })

    const insert = state.calls.find(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')
    )

    expect(insert?.params[1]).toBe('mcp:agent-7')
    expect(insert?.params[4]).toBe('user-42')
  })

  it('declarar la misma intención dos veces es no-op idempotente, no una fila nueva', async () => {
    state.activeKeywords = ['berel']
    state.activeIntents = { berel: 'target' }

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON, intent: 'target' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(statusOf(result.outcomes, 'berel')).toBe('already_tracked')
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('un caller que no declara intención NO reescribe la que ya existe', async () => {
    state.activeKeywords = ['berel']
    state.activeIntents = { berel: 'target' }

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(statusOf(result.outcomes, 'berel')).toBe('already_tracked')
    expect(result.outcomes[0]?.intent).toBe('target')
    expect(
      state.calls.some(call => call.sql.includes('UPDATE greenhouse_growth.seo_keyword_set_members'))
    ).toBe(false)
  })

  it('cambiar la intención cierra la membresía anterior y abre otra — nunca un UPDATE de la columna', async () => {
    state.activeKeywords = ['berel']
    state.activeIntents = { berel: 'opportunity' }

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON, intent: 'target' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(statusOf(result.outcomes, 'berel')).toBe('intent_changed')
    expect(result.outcomes[0]?.previousIntent).toBe('opportunity')
    expect(result.outcomes[0]?.intent).toBe('target')

    const close = state.calls.find(call => call.sql.includes('SET effective_to = clock_timestamp()'))

    expect(close).toBeDefined()
    // 🔴 `NOW()` daría `effective_to = effective_from` y reventaría el CHECK (23514).
    expect(close?.sql).not.toContain('NOW()')
    // La columna NUNCA se sobrescribe: el histórico "es objetivo desde marzo" es el dato.
    expect(state.calls.some(call => /SET\s+intent\s*=/.test(call.sql))).toBe(false)
  })

  it('declarar una intención sobre una membresía sin intención también es un cambio historiado', async () => {
    state.activeKeywords = ['berel']

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON, intent: 'opportunity' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(statusOf(result.outcomes, 'berel')).toBe('intent_changed')
    expect(result.outcomes[0]?.previousIntent).toBeUndefined()
  })

  it('el cambio de intención NO consume cupo del techo', async () => {
    state.activeKeywords = ['berel', 'pintura']
    state.activeIntents = { berel: 'opportunity' }

    const result = await trackKeywords('seot-1', ['berel'], 'user-1', {
      env: envWithCapacity(2),
      intent: 'target'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Con el set lleno, reclasificar sigue siendo posible — es justo cuando más falta hace.
    expect(statusOf(result.outcomes, 'berel')).toBe('intent_changed')
    expect(result.activeKeywordCount).toBe(2)
  })

  it('un cambio de intención emite evento aunque el conteo vigente no se mueva', async () => {
    state.activeKeywords = ['berel']
    state.activeIntents = { berel: 'opportunity' }

    await trackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON, intent: 'target' })

    expect(state.outboxEvents).toHaveLength(1)

    const event = state.outboxEvents[0] as { payload: Record<string, unknown> }

    expect(event.payload).toMatchObject({ trackedCount: 0, intentChangedCount: 1, declaredIntent: 'target' })
  })
})

describe('untrackKeywords — el reverso del compromiso de gasto', () => {
  it('cierra la ventana de la keyword vigente, no la borra', async () => {
    state.activeKeywords = ['berel', 'pintura berel']

    const result = await untrackKeywords('seot-1', ['Berel'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes).toEqual([{ keyword: 'berel', status: 'untracked' }])

    const update = state.calls.find(call => call.sql.includes('UPDATE greenhouse_growth.seo_keyword_set_members'))

    // `clock_timestamp()` y no `NOW()`: NOW() devuelve el inicio de la transacción, así que
    // cerrar una membresía creada en ella daría `effective_to = effective_from` y reventaría
    // el CHECK `effective_to > effective_from`. Lo encontró el sanity contra PG real.
    expect(update?.sql).toContain('SET effective_to = clock_timestamp()')
    expect(update?.sql).not.toContain('SET effective_to = NOW()')
    // Append-only: jamás un DELETE sobre la tabla (el trigger de 1299 lo prohíbe).
    expect(state.calls.some(call => call.sql.includes('DELETE FROM greenhouse_growth.seo_keyword_set_members'))).toBe(
      false
    )
  })

  it('una keyword que no se seguía devuelve not_tracked sin escribir ni emitir', async () => {
    state.activeKeywords = []

    const result = await untrackKeywords('seot-1', ['fantasma'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.outcomes[0].status).toBe('not_tracked')
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('🔴 un target PAUSADO sí puede dejar de seguir: bloquear la salida congelaría el gasto', async () => {
    state.target = [{ organization_id: 'org-1', status: 'paused' }]
    state.activeKeywords = ['berel']

    const result = await untrackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result.ok).toBe(true)
  })

  it('sin entitlement del módulo no opera', async () => {
    state.hasModule = false

    const result = await untrackKeywords('seot-1', ['berel'], 'user-1', { env: ENV_ON })

    expect(result).toEqual({ ok: false, errorCode: 'no_entitlement', status: null })
  })

  it('con el módulo apagado no toca la base', async () => {
    const result = await untrackKeywords('seot-1', ['berel'], 'user-1', {
      env: {} as unknown as NodeJS.ProcessEnv
    })

    expect(result).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(state.calls).toHaveLength(0)
  })
})
