import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 1 — `captureRankSnapshot` + `parseSerpRankObservation`.
 *
 * Cubre los invariantes duros del command: gate de costo ANTES del provider, spend fence
 * a mitad de batch, idempotencia sin gasto (pre-check), honest degradation (0 capturados
 * con elegibles ≠ succeeded), breaker corta el resto, outbox solo cuando hay capturas, y
 * el INSERT con `ON CONFLICT DO NOTHING` (el trigger de TASK-1299 prohíbe DO UPDATE).
 * PG mockeado con routing por SQL (patrón del test de entitlement TASK-1301).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  target: {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'berel.cl',
    location_code: '2152',
    language_code: 'es',
    status: 'active'
  } as Record<string, unknown> | null,
  keywords: ['pintura para techos', 'impermeabilizante'],
  existing: [] as Array<{ keyword: string; engine: string; device: string }>,
  inserts: [] as SqlCall[],
  sqlLog: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.sqlLog.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('seo_keyword_set_members')) {
      return state.keywords.map(keyword => ({ keyword }))
    }

    if (sql.includes('SELECT keyword, engine, device')) {
      return state.existing
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_rank_snapshots')) {
      state.inserts.push({ sql, params })

      return []
    }

    return []
  }
}))

// TASK-1699 — rank-capture ahora importa `withTransaction` (@/lib/db) y el módulo
// serp-top-results para el top-N. Mocks de carga: el camino con flag OFF no los usa.
vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (client: unknown) => Promise<unknown>) =>
    callback({ query: async () => ({ rows: [], rowCount: 1 }) })
}))

vi.mock('../serp-top-results', () => ({
  parseSerpTopResults: () => [],
  persistSerpTopResults: async () => ({ rowsWritten: 0 })
}))

const gateMock = vi.fn()

vi.mock('../entitlement', () => ({
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT: '/v3/serp/google/organic/live/advanced',
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => true,
  // TASK-1699 — flag OFF en estas suites: el camino legacy queda idéntico.
  isSeoSerpTopResultsEnabled: () => false
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  SERP_RANK_CAPTURE_DEPTH,
  SERP_RANK_CAPTURE_ESTIMATED_COST_USD,
  SPEND_FENCE_RECHECK_EVERY,
  captureRankSnapshot,
  parseSerpRankObservation
} from '../rank-capture'

const allowedGate = {
  allowed: true,
  tier: 'contracted',
  allowanceRemaining: 8,
  budgetRemainingUsd: 40,
  blockedReason: null
}

const blockedGate = {
  allowed: false,
  tier: 'trial',
  allowanceRemaining: 0,
  budgetRemainingUsd: 0,
  blockedReason: 'budget_exhausted'
}

const serpResponse = (options: { position?: number; domain?: string; url?: string; cost?: number } = {}) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/serp/google/organic/live/advanced',
  cost: options.cost ?? 0.002,
  latencyMs: 10,
  secretSource: 'env',
  tasks: [
    {
      result: [
        {
          items: [
            { type: 'ai_overview' },
            {
              type: 'organic',
              rank_group: options.position ?? 3,
              rank_absolute: (options.position ?? 3) + 1,
              domain: options.domain ?? 'www.berel.cl',
              url: options.url ?? 'https://www.berel.cl/techos'
            }
          ]
        }
      ]
    }
  ]
})

beforeEach(() => {
  state.target = {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'berel.cl',
    location_code: '2152',
    language_code: 'es',
    status: 'active'
  }
  state.keywords = ['pintura para techos', 'impermeabilizante']
  state.existing = []
  state.inserts = []
  state.sqlLog = []
  gateMock.mockReset().mockResolvedValue(allowedGate)
  providerMock.mockReset().mockResolvedValue(serpResponse())
  outboxMock.mockReset().mockResolvedValue('outbox-1')
})

describe('captureRankSnapshot — gate de costo', () => {
  it('bloqueado upfront: NO pega el provider y mapea el blockedReason', async () => {
    gateMock.mockResolvedValue(blockedGate)

    const result = await captureRankSnapshot('seot-1', 'system:test')

    expect(result).toEqual({ ok: false, errorCode: 'budget_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
    expect(state.inserts).toHaveLength(0)
  })

  it('pasa estimatedCostUsd del batch COMPLETO y consumesAuditAllowance=false', async () => {
    await captureRankSnapshot('seot-1', 'system:test')

    expect(gateMock).toHaveBeenCalledWith('org-1', {
      estimatedCostUsd: expect.closeTo(2 * SERP_RANK_CAPTURE_ESTIMATED_COST_USD, 10),
      consumesAuditAllowance: false
    })
  })

  it('la task SERP lleva depth 20 + load_async_ai_overview (promesa AI Overview §5)', async () => {
    await captureRankSnapshot('seot-1', 'system:test')

    const input = providerMock.mock.calls[0][0] as { tasks: Array<Record<string, unknown>> }

    expect(input.tasks[0]).toMatchObject({
      depth: SERP_RANK_CAPTURE_DEPTH,
      load_async_ai_overview: true,
      language_code: 'es',
      location_code: 2152,
      device: 'desktop'
    })
  })

  it('spend fence: re-consulta cada K llamadas y frena el resto del batch', async () => {
    state.keywords = Array.from({ length: SPEND_FENCE_RECHECK_EVERY + 5 }, (_, i) => `kw-${i}`)

    // 1ª consulta (upfront) permite; la re-consulta del fence bloquea.
    gateMock.mockResolvedValueOnce(allowedGate).mockResolvedValue(blockedGate)

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(providerMock).toHaveBeenCalledTimes(SPEND_FENCE_RECHECK_EVERY)
    expect(result.captured).toBe(SPEND_FENCE_RECHECK_EVERY)
    expect(result.budgetBlocked).toBe(5)
    expect(result.status).toBe('partial')
  })
})

describe('captureRankSnapshot — idempotencia sin gasto', () => {
  it('filtra combos ya capturados hoy ANTES de pegar el provider', async () => {
    state.existing = [{ keyword: 'pintura para techos', engine: 'google', device: 'desktop' }]

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(providerMock).toHaveBeenCalledTimes(1)
    expect(result.alreadyCaptured).toBe(1)
    expect(result.captured).toBe(1)
    expect(result.status).toBe('succeeded')
  })

  it('re-run completo del día: skipped, cero llamadas, cero gasto, sin gate', async () => {
    state.existing = [
      { keyword: 'pintura para techos', engine: 'google', device: 'desktop' },
      { keyword: 'impermeabilizante', engine: 'google', device: 'desktop' }
    ]

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.status).toBe('skipped')
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('el INSERT usa ON CONFLICT DO NOTHING (el trigger de TASK-1299 prohíbe DO UPDATE)', async () => {
    await captureRankSnapshot('seot-1', 'system:test')

    expect(state.inserts.length).toBeGreaterThan(0)

    for (const insert of state.inserts) {
      expect(insert.sql).toContain('ON CONFLICT (seo_target_id, keyword, engine, device, capture_date) DO NOTHING')
      expect(insert.sql).not.toContain('DO UPDATE')
    }
  })
})

describe('captureRankSnapshot — captura y parse', () => {
  it('persiste position/url/serp_features/provider_cost y emite el outbox event', async () => {
    const result = await captureRankSnapshot('seot-1', 'system:cron', { captureDate: '2026-08-06' })

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.status).toBe('succeeded')
    expect(result.captured).toBe(2)
    expect(result.costUsd).toBeCloseTo(0.004, 10)

    const [, keyword, engine, device, captureDate, position, url, serpFeatures] = state.inserts[0].params

    expect(keyword).toBe('pintura para techos')
    expect(engine).toBe('google')
    expect(device).toBe('desktop')
    expect(captureDate).toBe('2026-08-06')
    expect(position).toBe(3)
    expect(url).toBe('https://www.berel.cl/techos')
    expect(JSON.parse(String(serpFeatures))).toEqual(['ai_overview'])

    expect(outboxMock).toHaveBeenCalledTimes(1)
    expect(outboxMock.mock.calls[0][0]).toMatchObject({
      aggregateType: 'seo_target',
      aggregateId: 'seot-1',
      eventType: 'growth.seo.rank_snapshot.captured',
      payload: expect.objectContaining({
        seoTargetId: 'seot-1',
        organizationId: 'org-1',
        captureDate: '2026-08-06',
        snapshotCount: 2,
        actor: 'system:cron'
      })
    })
  })

  it('honest degradation: provider falla en todo → degraded, nunca succeeded, sin outbox', async () => {
    providerMock.mockResolvedValue({ ok: false, httpStatus: 500, tasks: [], cost: null })

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.status).toBe('degraded')
    expect(result.captured).toBe(0)
    expect(result.providerErrors).toBe(2)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('breaker abierto: declara el resto como breaker_open sin seguir llamando', async () => {
    providerMock.mockResolvedValue({ ok: false, httpStatus: 0, breakerOpen: true, tasks: [], cost: null })

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(providerMock).toHaveBeenCalledTimes(1)
    expect(result.breakerOpen).toBe(2)
    expect(result.status).toBe('degraded')
  })

  it('dominio no rankea: captura con position null (medición válida, no error)', async () => {
    providerMock.mockResolvedValue(serpResponse({ domain: 'competidor.cl', url: 'https://competidor.cl/x' }))

    const result = await captureRankSnapshot('seot-1', 'system:test')

    if (!result.ok) throw new Error('esperaba ok:true')

    expect(result.status).toBe('succeeded')
    expect(result.outcomes.filter(o => o.status === 'captured').every(o => o.position === null)).toBe(true)
  })

  it('degradaciones de configuración: target inexistente / inactivo / sin keywords', async () => {
    state.target = null
    expect(await captureRankSnapshot('seot-x', 'a')).toEqual({ ok: false, errorCode: 'target_not_found', status: null })

    state.target = { seo_target_id: 'seot-1', organization_id: 'org-1', root_domain: 'berel.cl', location_code: '2152', language_code: 'es', status: 'paused' }
    expect(await captureRankSnapshot('seot-1', 'a')).toEqual({ ok: false, errorCode: 'target_not_active', status: null })

    state.target = { seo_target_id: 'seot-1', organization_id: 'org-1', root_domain: 'berel.cl', location_code: '2152', language_code: 'es', status: 'active' }
    state.keywords = []
    expect(await captureRankSnapshot('seot-1', 'a')).toEqual({ ok: false, errorCode: 'no_keywords', status: null })
  })

  it('engine/device no soportados en V1 lanzan (caller roto, no degradación)', async () => {
    await expect(captureRankSnapshot('seot-1', 'a', { engines: ['bing'] })).rejects.toThrow('engines no soportados')
    await expect(captureRankSnapshot('seot-1', 'a', { devices: ['tablet'] })).rejects.toThrow('devices no soportados')
  })
})

describe('parseSerpRankObservation', () => {
  const buildTasks = (items: unknown[]) => [{ result: [{ items }] }]

  it('matchea el dominio propio normalizando www y subdominios', () => {
    const observation = parseSerpRankObservation(
      buildTasks([
        { type: 'organic', rank_group: 5, domain: 'otro.cl', url: 'https://otro.cl' },
        { type: 'organic', rank_group: 8, domain: 'blog.berel.cl', url: 'https://blog.berel.cl/post' }
      ]),
      'https://www.berel.cl/'
    )

    expect(observation.position).toBe(8)
    expect(observation.url).toBe('https://blog.berel.cl/post')
  })

  it('cae a rank_absolute si falta rank_group y al hostname del url si falta domain', () => {
    const observation = parseSerpRankObservation(
      buildTasks([{ type: 'organic', rank_absolute: 12, url: 'https://www.berel.cl/productos' }]),
      'berel.cl'
    )

    expect(observation.position).toBe(12)
  })

  it('junta los SERP features (tipos no-organic, únicos y ordenados)', () => {
    const observation = parseSerpRankObservation(
      buildTasks([
        { type: 'people_also_ask' },
        { type: 'ai_overview' },
        { type: 'ai_overview' },
        { type: 'organic', rank_group: 1, domain: 'berel.cl', url: 'https://berel.cl' }
      ]),
      'berel.cl'
    )

    expect(observation.serpFeatures).toEqual(['ai_overview', 'people_also_ask'])
  })

  it('payload malformado o sin match → position null sin lanzar', () => {
    expect(parseSerpRankObservation([null, 42, { result: 'x' }], 'berel.cl')).toEqual({
      position: null,
      url: null,
      serpFeatures: []
    })
  })
})
