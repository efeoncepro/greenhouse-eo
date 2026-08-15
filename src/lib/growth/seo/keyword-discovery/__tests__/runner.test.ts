import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1664 — Runner async.
 *
 * Cubre el contrato de gasto y la degradación honesta: claim atómico, gate antes de la
 * primera llamada, persistencia del `keyword_info` inline en el store de mercado (segundo
 * productor de TASK-1661), top-up de enriquecimiento SOLO del faltante, estados
 * `succeeded|partial|no_results|budget_blocked|failed` y el boundary de no-tracking.
 *
 * El SQL real se ejercita contra PG en `scripts/growth/_sanity-task-1664-keyword-discovery.ts`.
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  claim: null as Record<string, unknown> | null,
  pendingRuns: [] as Array<{ run_id: string }>,
  freshKeywords: [] as Array<{ normalized_keyword: string }>,
  calls: [] as SqlCall[],
  candidateInsertRowCount: 1
}

const routeSql = async (sql: string, params: unknown[] = []): Promise<{ rows: unknown[]; rowCount: number }> => {
  state.calls.push({ sql, params })

  if (sql.includes('UPDATE greenhouse_growth.seo_keyword_discovery_runs r')) {
    return { rows: state.claim ? [state.claim] : [], rowCount: state.claim ? 1 : 0 }
  }

  if (sql.includes("WHERE status = 'pending'")) {
    return { rows: state.pendingRuns, rowCount: state.pendingRuns.length }
  }

  if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_market_data')) {
    return { rows: [], rowCount: 1 }
  }

  if (sql.includes('FROM greenhouse_growth.seo_keyword_market_data')) {
    return { rows: state.freshKeywords, rowCount: state.freshKeywords.length }
  }

  if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_candidates')) {
    return { rows: [], rowCount: state.candidateInsertRowCount }
  }

  return { rows: [], rowCount: 0 }
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params?: unknown[]) => (await routeSql(sql, params ?? [])).rows,
  withGreenhousePostgresTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: (sql: string, params?: unknown[]) => routeSql(sql, params ?? []) })
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

const gateMock = vi.fn()

vi.mock('../../entitlement', () => ({
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const flags = { module: true, discovery: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoKeywordDiscoveryEnabled: () => flags.discovery
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { drainKeywordDiscoveryRuns, runKeywordDiscovery } from '../runner'

const okGate = { allowed: true, tier: 'contracted', allowanceRemaining: 5, budgetRemainingUsd: 40, blockedReason: null }

const claimedRun = (overrides: Record<string, unknown> = {}) => ({
  run_id: 'seokdr-1',
  organization_id: 'org-1',
  seo_target_id: 'seot-1',
  location_code: '2152',
  language_code: 'es',
  seed_inputs_json: {
    seeds: [
      { keyword: 'pintura', normalizedKeyword: 'pintura', origin: 'manual' },
      { keyword: 'esmalte', normalizedKeyword: 'esmalte', origin: 'manual' }
    ]
  },
  methods_json: [{ method: 'keyword_suggestions', resultsPerCall: 50 }],
  estimated_cost_usd: '0.05',
  root_domain: 'ejemplo.cl',
  ...overrides
})

const providerItem = (keyword: string) => ({
  keyword,
  keyword_info: { search_volume: 700, cpc: 0.2, competition: 0.3, competition_level: 'LOW', last_updated_time: '2026-07-15 00:00:00 +00:00' },
  keyword_properties: { keyword_difficulty: 12, core_keyword: keyword },
  search_intent_info: { main_intent: 'commercial', probability: 0.7 }
})

const providerOk = (items: unknown[], cost = 0.014) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/dataforseo_labs/google/keyword_suggestions/live',
  cost,
  latencyMs: 100,
  secretSource: 'env',
  tasks: [{ status_code: 20000, result: [{ items }] }]
})

beforeEach(() => {
  state.claim = claimedRun()
  state.pendingRuns = []
  state.freshKeywords = []
  state.calls = []
  state.candidateInsertRowCount = 1
  outboxMock.mockReset()
  gateMock.mockReset()
  gateMock.mockResolvedValue(okGate)
  providerMock.mockReset()
  flags.module = true
  flags.discovery = true
})

describe('runKeywordDiscovery — claim y gates', () => {
  it('con el flag OFF no reclama ni llama al proveedor', async () => {
    flags.discovery = false

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result).toEqual({ ok: false, errorCode: 'seo_keyword_discovery_disabled' })
    expect(state.calls).toHaveLength(0)
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('una corrida ya reclamada por otro worker responde busy sin gasto', async () => {
    state.claim = null

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result).toEqual({ ok: false, errorCode: 'busy' })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('gate bloqueado ANTES de la primera llamada cierra budget_blocked con costo cero', async () => {
    gateMock.mockResolvedValue({ ...okGate, allowed: false, blockedReason: 'budget_exhausted' })

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.status).toBe('budget_blocked')
    expect(result.actualCostUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()

    // El cierre emite el evento completed con el estado honesto.
    expect(outboxMock).toHaveBeenCalledTimes(1)
    expect(outboxMock.mock.calls[0][0].payload.status).toBe('budget_blocked')
  })
})

describe('runKeywordDiscovery — ejecución', () => {
  it('happy path: una llamada por seed, candidatos insertados y keyword_info inline persistido', async () => {
    providerMock.mockResolvedValue(providerOk([providerItem('pintura para piso'), providerItem('pintura exterior')]))
    // Las keywords de los items quedan frescas tras la primera persistencia inline: el
    // top-up no debería comprar nada.
    state.freshKeywords = [
      { normalized_keyword: 'pintura para piso' },
      { normalized_keyword: 'pintura exterior' }
    ]

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.status).toBe('succeeded')
    // 2 seeds × keyword_suggestions = 2 llamadas; el top-up no compró (todo fresco).
    expect(providerMock).toHaveBeenCalledTimes(2)
    expect(result.providerCalls).toBe(2)
    expect(result.candidateCount).toBe(2)

    // El keyword_info inline fue al store de mercado con la procedencia del endpoint.
    const marketInserts = state.calls.filter(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_market_data')
    )

    expect(marketInserts.length).toBeGreaterThan(0)
    expect(marketInserts[0].params).toContain('keyword_suggestions')

    // El payload del proveedor usa el transporte canónico con familia labs y tag del run.
    const firstCall = providerMock.mock.calls[0][0]

    expect(firstCall.family).toBe('labs')
    expect(firstCall.organizationId).toBe('org-1')
    expect(firstCall.tasks[0].tag).toContain('seokdr-1')
    expect(firstCall.tasks[0].include_clickstream_data).toBe(false)
  })

  it('la misma keyword desde dos seeds conserva UNA fila con ambas procedencias', async () => {
    providerMock.mockResolvedValue(providerOk([providerItem('pintura lavable')]))
    state.freshKeywords = [{ normalized_keyword: 'pintura lavable' }]

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const candidateInserts = state.calls.filter(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_candidates')
    )

    expect(candidateInserts).toHaveLength(1)

    const seeds = JSON.parse(candidateInserts[0].params[5] as string) as string[]

    expect(seeds.sort()).toEqual(['esmalte', 'pintura'])
  })

  it('proveedor caído en TODAS las llamadas = failed, nunca lista vacía silenciosa', async () => {
    providerMock.mockResolvedValue({
      ok: false,
      httpStatus: 500,
      endpoint: '',
      cost: 0.012,
      latencyMs: 50,
      secretSource: 'env',
      tasks: []
    })

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('provider_error')
    // El costo cobrado por las llamadas fallidas se conserva (la falla también se paga).
    expect(result.actualCostUsd).toBeCloseTo(0.024, 6)
  })

  it('breaker abierto corta el resto del batch declarándolo', async () => {
    providerMock.mockResolvedValue({
      ok: false,
      httpStatus: 0,
      endpoint: '',
      cost: null,
      latencyMs: 0,
      secretSource: 'unconfigured',
      breakerOpen: true,
      tasks: []
    })

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('breaker_open')
    // Con 2 seeds pendientes, el breaker en la primera llamada evita la segunda.
    expect(providerMock).toHaveBeenCalledTimes(1)
  })

  it('una corrida GSC-only (cero métodos) cierra no_results con costo y llamadas en cero', async () => {
    state.claim = claimedRun({ methods_json: [] })

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.status).toBe('no_results')
    expect(result.providerCalls).toBe(0)
    expect(result.actualCostUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('el top-up de enriquecimiento compra SOLO lo que falta y escribe la fila NULL de lo ausente', async () => {
    // Primera llamada (suggestions) trae 2 keywords; una queda fresca por la persistencia
    // inline simulada, la otra no está en el store → el top-up pregunta por ella.
    providerMock
      .mockResolvedValueOnce(providerOk([providerItem('pintura para piso'), { keyword: 'sin datos inline' }]))
      .mockResolvedValueOnce(providerOk([providerItem('pintura para piso')], 0.012))
      // Segunda seed: sin resultados.
      .mockResolvedValueOnce(providerOk([], 0.012))

    state.claim = claimedRun({
      seed_inputs_json: { seeds: [{ keyword: 'pintura', normalizedKeyword: 'pintura', origin: 'manual' }] }
    })

    // El store dice que 'pintura para piso' YA está fresca; 'sin datos inline' no.
    state.freshKeywords = [{ normalized_keyword: 'pintura para piso' }]

    const result = await runKeywordDiscovery('seokdr-1')

    expect(result.ok).toBe(true)

    if (!result.ok) return

    // 1 llamada suggestions + 1 top-up (la seed única produjo una sola llamada de expansión).
    expect(providerMock).toHaveBeenCalledTimes(2)

    const overviewCall = providerMock.mock.calls[1][0]

    expect(overviewCall.endpoint).toContain('keyword_overview')
    // Sólo la keyword SIN métrica vigente se compra.
    expect(overviewCall.tasks[0].keywords).toEqual(['sin datos inline'])

    // La keyword preguntada y ausente en la respuesta del top-up escribe fila con NULLs
    // (tres estados del store 1661) para no re-comprarla en el mismo ciclo.
    const overviewInserts = state.calls.filter(
      call =>
        call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_market_data') &&
        call.params.includes('keyword_overview')
    )

    expect(overviewInserts).toHaveLength(1)
    expect(overviewInserts[0].params[0]).toBe('sin datos inline')
    expect(overviewInserts[0].params[4]).toBeNull()
  })

  it('ninguna pieza del runner escribe seo_keyword_set_members', async () => {
    providerMock.mockResolvedValue(providerOk([providerItem('pintura para piso')]))

    await runKeywordDiscovery('seokdr-1')

    expect(state.calls.some(call => call.sql.includes('seo_keyword_set_members'))).toBe(false)
  })
})

describe('drainKeywordDiscoveryRuns', () => {
  it('con flag OFF es no-op prod-safe', async () => {
    flags.discovery = false

    const summary = await drainKeywordDiscoveryRuns()

    expect(summary.pending).toBe(0)
    expect(state.calls).toHaveLength(0)
  })

  it('procesa pendientes por orden con resiliencia per-run', async () => {
    state.pendingRuns = [{ run_id: 'seokdr-1' }]
    providerMock.mockResolvedValue(providerOk([providerItem('pintura para piso')]))
    state.freshKeywords = [{ normalized_keyword: 'pintura para piso' }]

    const summary = await drainKeywordDiscoveryRuns({ maxRuns: 3 })

    expect(summary.pending).toBe(1)
    expect(summary.processed).toBe(1)
    expect(summary.succeeded).toBe(1)
    expect(summary.outcomes).toEqual([{ runId: 'seokdr-1', status: 'succeeded' }])
  })
})
