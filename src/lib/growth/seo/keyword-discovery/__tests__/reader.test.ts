import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1664 — Reader de discovery.
 *
 * Cubre las reglas de honestidad del DTO: anti-oracle por org, composición en memoria de la
 * lente de mercado (◑) vía el reader canónico de TASK-1661 (nunca SQL directo), la lente GSC
 * medida (●) como campo SEPARADO, el orden por defecto de la spec y los filtros que exigen
 * dato presente (la ausencia nunca se convierte en 0).
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  runs: [] as Array<Record<string, unknown>>,
  candidates: [] as Array<Record<string, unknown>>,
  gscRows: [] as Array<{ query: string; impressions: string; weighted_position: string | null }>,
  tracked: [] as Array<{ keyword: string }>,
  actions: [] as Array<Record<string, unknown>>,
  calls: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.calls.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_runs')) return state.runs
    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_candidates')) return state.candidates
    if (sql.includes('FROM greenhouse_growth.seo_gsc_daily')) return state.gscRows
    if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) return state.tracked
    if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_actions')) return state.actions

    return []
  }
}))

const marketMock = vi.fn()

vi.mock('../../keyword-market-data', () => ({
  normalizeMarketKeyword: (keyword: string) =>
    keyword.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(),
  readKeywordMarketData: (...args: unknown[]) => marketMock(...args)
}))

import { readKeywordDiscovery } from '../reader'

const runRow = (overrides: Record<string, unknown> = {}) => ({
  run_id: 'seokdr-1',
  seo_target_id: 'seot-1',
  source_kind: 'manual',
  status: 'succeeded',
  location_code: '2152',
  language_code: 'es',
  seed_inputs_json: { seeds: [{ keyword: 'pintura', normalizedKeyword: 'pintura', origin: 'manual' }] },
  methods_json: [{ method: 'keyword_suggestions', resultsPerCall: 50 }],
  estimated_cost_usd: '0.02',
  actual_cost_usd: '0.018',
  provider_calls: 2,
  candidate_count: 2,
  error_code: null,
  created_by: 'user-1',
  requested_at: new Date('2026-08-14T12:00:00Z'),
  started_at: new Date('2026-08-14T12:01:00Z'),
  completed_at: new Date('2026-08-14T12:02:00Z'),
  ...overrides
})

const candidateRow = (overrides: Record<string, unknown> = {}) => ({
  candidate_id: 'seokdc-1',
  run_id: 'seokdr-1',
  keyword: 'pintura industrial',
  normalized_keyword: 'pintura industrial',
  seed_keywords_json: ['pintura'],
  source_endpoint: 'keyword_suggestions',
  source_rank: 1,
  captured_at: new Date('2026-08-14T12:01:30Z'),
  ...overrides
})

const marketEmpty = {
  market: 'unavailable' as const,
  byKeyword: new Map(),
  linkBarrierByKeyword: new Map(),
  freshness: { freshKeywords: 0, latestCaptureDate: null }
}

const datum = (normalizedKeyword: string, overrides: Record<string, unknown> = {}) => ({
  normalizedKeyword,
  keyword: normalizedKeyword,
  locationCode: '2152',
  languageCode: 'es',
  searchVolume: 1000,
  keywordDifficulty: 20,
  competition: 0.4,
  competitionLevel: 'medium',
  cpcUsd: 0.5,
  searchIntent: 'commercial',
  searchIntentProbability: 0.8,
  coreKeyword: 'pintura',
  providerLastUpdatedAt: '2026-07-15T00:00:00.000Z',
  avgPageRank: 10,
  avgMainDomainRank: 200,
  avgBacklinks: 5,
  avgReferringDomains: 3,
  ...overrides
})

beforeEach(() => {
  state.runs = []
  state.candidates = []
  state.gscRows = []
  state.tracked = []
  state.actions = []
  state.calls = []
  marketMock.mockReset()
  marketMock.mockResolvedValue(marketEmpty)
})

describe('readKeywordDiscovery — runs', () => {
  it('un runId de otra org responde run_not_found (anti-oracle)', async () => {
    state.runs = []

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-ajeno' })

    expect(result).toEqual({ ok: false, errorCode: 'run_not_found' })
  })

  it('sin runId lista el historial de corridas sin componer candidatos', async () => {
    state.runs = [runRow()]

    const result = await readKeywordDiscovery({ organizationId: 'org-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.runs).toHaveLength(1)
    expect(result.runs[0].estimatedCostUsd).toBe(0.02)
    expect(result.candidates).toHaveLength(0)
    expect(marketMock).not.toHaveBeenCalled()
  })
})

describe('readKeywordDiscovery — composición de candidatos', () => {
  it('compone mercado (◑) por el reader canónico y GSC medido (●) como lente separada', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]
    state.gscRows = [{ query: 'pintura industrial', impressions: '340', weighted_position: '12.4' }]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['pintura industrial', datum('pintura industrial')]]),
      linkBarrierByKeyword: new Map([['pintura industrial', 'low']]),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const candidate = result.candidates[0]

    expect(candidate.searchVolume).toBe(1000)
    expect(candidate.difficulty).toBe(20)
    expect(candidate.displayMarker).toBe('◑')
    expect(candidate.measuredGsc).toEqual({ impressions: 340, position: 12.4, displayMarker: '●' })
    expect(candidate.linkBarrier).toBe('low')
    expect(result.marketAvailability).toBe('available')
    expect(result.marketFreshness).toBe('2026-08-13')

    // El reader JAMÁS consulta la tabla de mercado directo: pasa por el reader canónico.
    expect(state.calls.some(call => call.sql.includes('seo_keyword_market_data'))).toBe(false)
  })

  it('sin dato de mercado la fila viaja con null, nunca con 0', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates[0].searchVolume).toBeNull()
    expect(result.candidates[0].difficulty).toBeNull()
    expect(result.marketAvailability).toBe('unavailable')
  })

  it('alreadyTracked refleja el set vigente sin escribirlo', async () => {
    state.runs = [runRow()]
    state.candidates = [candidateRow()]
    state.tracked = [{ keyword: 'Pintura Industrial' }]

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates[0].alreadyTracked).toBe(true)

    const writesToSet = state.calls.filter(
      call => call.sql.includes('seo_keyword_set_members') && !call.sql.trimStart().startsWith('SELECT')
    )

    expect(writesToSet).toHaveLength(0)
  })
})

describe('readKeywordDiscovery — orden y filtros', () => {
  it('ordena: acción pendiente primero, luego match de seed, luego volumen desc', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-a', keyword: 'accionada', normalized_keyword: 'accionada' }),
      candidateRow({ candidate_id: 'seokdc-b', keyword: 'pintura', normalized_keyword: 'pintura' }),
      candidateRow({ candidate_id: 'seokdc-c', keyword: 'volumen alto', normalized_keyword: 'volumen alto' }),
      candidateRow({ candidate_id: 'seokdc-d', keyword: 'volumen bajo', normalized_keyword: 'volumen bajo' })
    ]
    state.actions = [
      { candidate_id: 'seokdc-a', action_kind: 'dismissed', actor: 'user-1', created_at: new Date('2026-08-14T13:00:00Z') }
    ]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([
        ['volumen alto', datum('volumen alto', { searchVolume: 9000, coreKeyword: null })],
        ['volumen bajo', datum('volumen bajo', { searchVolume: 10, coreKeyword: null })]
      ]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 2, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    const order = result.candidates.map(candidate => candidate.candidateId)

    // 'pintura' matchea seed (primero entre pendientes); luego volumen desc; la accionada al final.
    expect(order).toEqual(['seokdc-b', 'seokdc-c', 'seokdc-d', 'seokdc-a'])
  })

  it('minSearchVolume exige dato presente: null queda excluido por el filtro explícito', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-1', normalized_keyword: 'con dato', keyword: 'con dato' }),
      candidateRow({ candidate_id: 'seokdc-2', normalized_keyword: 'sin dato', keyword: 'sin dato' })
    ]
    marketMock.mockResolvedValue({
      market: 'available',
      byKeyword: new Map([['con dato', datum('con dato', { searchVolume: 500 })]]),
      linkBarrierByKeyword: new Map(),
      freshness: { freshKeywords: 1, latestCaptureDate: '2026-08-13' }
    })

    const result = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', minSearchVolume: 100 })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.candidates.map(candidate => candidate.candidateId)).toEqual(['seokdc-1'])
  })

  it('pagina con limit + cursor y reporta el total', async () => {
    state.runs = [runRow()]
    state.candidates = [
      candidateRow({ candidate_id: 'seokdc-1', normalized_keyword: 'a', keyword: 'a' }),
      candidateRow({ candidate_id: 'seokdc-2', normalized_keyword: 'b', keyword: 'b' }),
      candidateRow({ candidate_id: 'seokdc-3', normalized_keyword: 'c', keyword: 'c' })
    ]

    const first = await readKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1', limit: 2 })

    expect(first.ok).toBe(true)

    if (!first.ok) return

    expect(first.candidates).toHaveLength(2)
    expect(first.totalCandidates).toBe(3)
    expect(first.nextCursor).toBe('2')

    const second = await readKeywordDiscovery({
      organizationId: 'org-1',
      runId: 'seokdr-1',
      limit: 2,
      cursor: first.nextCursor
    })

    expect(second.ok).toBe(true)

    if (!second.ok) return

    expect(second.candidates).toHaveLength(1)
    expect(second.nextCursor).toBeNull()
  })
})
