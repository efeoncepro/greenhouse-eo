import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1662 Slice 1 — commands `declareCompetitors` / `retireCompetitors`.
 *
 * El foco NO es "¿inserta?": es el contrato de **gasto diferido** (techo por target,
 * idempotencia, outcome por ítem, reverso con autoría) y el de **declaración con autor**
 * (autoría obligatoria, propuesta opaca, el dominio del propio cliente no es declarable).
 *
 * El SQL (índice único parcial, `FOR UPDATE`, CHECKs de autoría, `clock_timestamp()`) se
 * ejercita contra PG real en `scripts/growth/_sanity-task-1662-keyword-gap.ts` — gate
 * TASK-893: los mocks ejercitan el TS, NUNCA el SQL.
 */

vi.mock('server-only', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  moduleEnabled: true,
  target: [
    { organization_id: 'org-1', status: 'active', root_domain: 'cliente.cl' }
  ] as Array<Record<string, unknown>>,
  hasModule: true,
  activeDomains: [] as string[],
  calls: [] as QueryCall[],
  outboxEvents: [] as Array<Record<string, unknown>>,
  thrown: null as Error | null
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

        if (sql.includes('FOR UPDATE')) {
          return {
            rows: state.activeDomains.map(domain => ({ competitor_domain: domain })),
            rowCount: state.activeDomains.length
          }
        }

        if (sql.includes('INSERT INTO greenhouse_growth.seo_competitors')) {
          const domains = (params.filter(p => Array.isArray(p)).at(-1) as string[]) ?? []

          return {
            rows: domains.map((domain, i) => ({
              seo_competitor_id: `seoc-${i + 1}`,
              competitor_domain: domain
            })),
            rowCount: domains.length
          }
        }

        if (sql.includes('UPDATE greenhouse_growth.seo_competitors')) {
          const asked = (params[1] as string[]) ?? []
          const closed = asked.filter(d => state.activeDomains.includes(d))

          return { rows: closed.map(domain => ({ competitor_domain: domain })), rowCount: closed.length }
        }

        if (sql.includes('COUNT(*)')) {
          return { rows: [{ n: String(state.activeDomains.length) }], rowCount: 1 }
        }

        return { rows: [], rowCount: 0 }
      }
    })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: Record<string, unknown>) => {
    state.outboxEvents.push(event)
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('../entitlement', () => ({
  resolveSeoEntitlement: async () => ({ hasModule: state.hasModule })
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => state.moduleEnabled
}))

const { declareCompetitors, retireCompetitors, normalizeCompetitorDomain, resolveCompetitorCapacity } =
  await import('../competitors')

beforeEach(() => {
  state.moduleEnabled = true
  state.target = [{ organization_id: 'org-1', status: 'active', root_domain: 'cliente.cl' }]
  state.hasModule = true
  state.activeDomains = []
  state.calls = []
  state.outboxEvents = []
  state.thrown = null
})

describe('normalizeCompetitorDomain', () => {
  it('normaliza scheme, path, www y mayúsculas al dominio raíz', () => {
    expect(normalizeCompetitorDomain('https://www.Competidor.CL/productos?x=1')).toBe('competidor.cl')
  })

  it('rechaza cadenas que no son un dominio', () => {
    expect(normalizeCompetitorDomain('no es un dominio')).toBeNull()
    expect(normalizeCompetitorDomain('')).toBeNull()
    expect(normalizeCompetitorDomain('sintld')).toBeNull()
  })
})

describe('declareCompetitors', () => {
  it('declara con autoría, dedupea y reporta outcome por ítem', async () => {
    const result = await declareCompetitors(
      'seot-1',
      ['https://www.rival.cl/', 'rival.cl', 'basura sin dominio'],
      'user-1',
      { source: 'mcp', proposalRef: 'serp_top:seot-1:2026-08-28' }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.outcomes).toEqual([
      { domain: 'rival.cl', status: 'declared', seoCompetitorId: 'seoc-1' },
      { domain: 'basura sin dominio', status: 'invalid' }
    ])
    expect(result.activeCompetitorCount).toBe(1)

    const insert = state.calls.find(c => c.sql.includes('INSERT INTO greenhouse_growth.seo_competitors'))

    expect(insert).toBeDefined()
    // Autoría completa en el INSERT: actor + clock_timestamp + procedencia + propuesta.
    expect(insert?.sql).toContain('clock_timestamp()')
    expect(insert?.params).toContain('user-1')
    expect(insert?.params).toContain('mcp')
    expect(insert?.params).toContain('serp_top:seot-1:2026-08-28')
  })

  it('el dominio del propio cliente es invalid, nunca declarable', async () => {
    const result = await declareCompetitors('seot-1', ['cliente.cl'], 'user-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcomes).toEqual([{ domain: 'cliente.cl', status: 'invalid' }])
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('re-declarar un vigente es no-op idempotente sin evento', async () => {
    state.activeDomains = ['rival.cl']

    const result = await declareCompetitors('seot-1', ['rival.cl'], 'user-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcomes).toEqual([{ domain: 'rival.cl', status: 'already_declared' }])
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('el techo se evalúa contra el conteo proyectado', async () => {
    process.env.GROWTH_SEO_COMPETITORS_PER_TARGET = '2'
    state.activeDomains = ['uno.cl']

    try {
      const result = await declareCompetitors('seot-1', ['dos.cl', 'tres.cl'], 'user-1')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.outcomes).toEqual([
        { domain: 'dos.cl', status: 'declared', seoCompetitorId: 'seoc-1' },
        { domain: 'tres.cl', status: 'capacity_exceeded' }
      ])
    } finally {
      delete process.env.GROWTH_SEO_COMPETITORS_PER_TARGET
    }
  })

  it('emite el evento de declaración dentro de la transacción sólo si el estado cambió', async () => {
    const result = await declareCompetitors('seot-1', ['rival.cl'], 'user-1')

    expect(result.ok).toBe(true)
    expect(state.outboxEvents).toHaveLength(1)
    expect(state.outboxEvents[0]).toMatchObject({
      eventType: 'growth.seo.competitor.declared',
      payload: expect.objectContaining({ declaredDomains: ['rival.cl'], organizationId: 'org-1' })
    })
  })

  it('rechaza target pausado, ausente, sin entitlement y módulo apagado', async () => {
    state.moduleEnabled = false
    expect(await declareCompetitors('seot-1', ['rival.cl'], 'u')).toMatchObject({ errorCode: 'disabled' })

    state.moduleEnabled = true
    state.target = []
    expect(await declareCompetitors('seot-1', ['rival.cl'], 'u')).toMatchObject({ errorCode: 'target_not_found' })

    state.target = [{ organization_id: 'org-1', status: 'paused', root_domain: 'cliente.cl' }]
    expect(await declareCompetitors('seot-1', ['rival.cl'], 'u')).toMatchObject({ errorCode: 'target_not_active' })

    state.target = [{ organization_id: 'org-1', status: 'active', root_domain: 'cliente.cl' }]
    state.hasModule = false
    expect(await declareCompetitors('seot-1', ['rival.cl'], 'u')).toMatchObject({ errorCode: 'no_entitlement' })
  })

  it('un lote sin dominios usables es no_domains', async () => {
    expect(await declareCompetitors('seot-1', ['', '   ', 'x'], 'u')).toMatchObject({ errorCode: 'no_domains' })
  })
})

describe('retireCompetitors', () => {
  it('cierra la vigencia con autoría del retiro y clock_timestamp', async () => {
    state.activeDomains = ['rival.cl']

    const result = await retireCompetitors('seot-1', ['rival.cl'], 'user-1', { reason: 'ya no compite' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcomes).toEqual([{ domain: 'rival.cl', status: 'retired' }])

    const update = state.calls.find(c => c.sql.includes('UPDATE greenhouse_growth.seo_competitors'))

    expect(update?.sql).toContain('clock_timestamp()')
    expect(update?.sql).toContain('retired_by')
    expect(update?.params).toContain('user-1')
    expect(update?.params).toContain('ya no compite')
    expect(state.outboxEvents[0]).toMatchObject({ eventType: 'growth.seo.competitor.retired' })
  })

  it('retirar algo no declarado es not_declared sin evento', async () => {
    const result = await retireCompetitors('seot-1', ['nadie.cl'], 'user-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.outcomes).toEqual([{ domain: 'nadie.cl', status: 'not_declared' }])
    expect(state.outboxEvents).toHaveLength(0)
  })

  it('retirar funciona aunque el target esté pausado (la salida nunca se bloquea)', async () => {
    state.target = [{ organization_id: 'org-1', status: 'paused', root_domain: 'cliente.cl' }]
    state.activeDomains = ['rival.cl']

    const result = await retireCompetitors('seot-1', ['rival.cl'], 'user-1')

    expect(result.ok).toBe(true)
  })
})

describe('resolveCompetitorCapacity', () => {
  it('default conservador y override por env', () => {
    expect(resolveCompetitorCapacity({} as NodeJS.ProcessEnv)).toBe(5)
    expect(resolveCompetitorCapacity({ GROWTH_SEO_COMPETITORS_PER_TARGET: '12' } as unknown as NodeJS.ProcessEnv)).toBe(12)
    expect(resolveCompetitorCapacity({ GROWTH_SEO_COMPETITORS_PER_TARGET: '-1' } as unknown as NodeJS.ProcessEnv)).toBe(5)
  })
})
