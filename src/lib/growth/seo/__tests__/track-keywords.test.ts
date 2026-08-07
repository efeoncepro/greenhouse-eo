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
  insertRowCount: null as number | null,
  calls: [] as QueryCall[],
  outboxEvents: [] as Array<Record<string, unknown>>,
  thrown: null as Error | null,
  captured: [] as unknown[]
}

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
          return { rows: state.activeKeywords.map(keyword => ({ keyword })), rowCount: state.activeKeywords.length }
        }

        if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_set_members')) {
          const inserted = (params[3] as string[]).length

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

import { normalizeTrackedKeyword, TRACKED_KEYWORDS_CAPACITY_ENV, trackKeywords } from '../track-keywords'

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
    expect(insert?.params[3]).toEqual(['berel'])
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
