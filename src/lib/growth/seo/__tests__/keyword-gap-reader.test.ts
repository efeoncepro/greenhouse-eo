import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1662 Slice 3 — `readKeywordGap`.
 *
 * Los tests cubren los cuatro invariantes del contrato (acceptance criteria de la task):
 * exclusión dura por GSC medido, cero orden propio (orden neutral alfabético + sin campo
 * de score), separación content_gap/ranks_worse/declaredTargets y `sin_dato` explícito por
 * factor ausente. El SQL se ejercita contra PG real en el sanity (gate TASK-893).
 */

vi.mock('server-only', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  moduleEnabled: true,
  hasModule: true,
  target: [
    { organization_id: 'org-1', location_code: '2152', language_code: 'es' }
  ] as Array<Record<string, unknown>>,
  competitors: [
    {
      seoCompetitorId: 'seoc-1',
      competitorDomain: 'rival.cl',
      declaredBy: 'user-1',
      declaredAt: '2026-08-01',
      declaredSource: 'operator_ui',
      proposalRef: null
    }
  ],
  runs: [
    { seo_competitor_id: 'seoc-1', coverage_run_id: 'seocr-1', capture_date: '2026-08-20', age_days: 8 }
  ] as Array<Record<string, unknown>>,
  coverage: [] as Array<Record<string, unknown>>,
  measured: [] as Array<{ query: string }>,
  memberships: [] as Array<Record<string, unknown>>,
  market: [] as Array<Record<string, unknown>>,
  calls: [] as QueryCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    state.calls.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) return state.target
    if (sql.includes('FROM greenhouse_growth.seo_competitor_coverage_runs')) return state.runs
    if (sql.includes('FROM greenhouse_growth.seo_competitor_keyword_coverage')) return state.coverage
    if (sql.includes('FROM greenhouse_growth.seo_gsc_daily')) return state.measured
    if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) return state.memberships
    if (sql.includes('FROM greenhouse_growth.seo_keyword_market_data')) return state.market

    return []
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('../competitors', () => ({
  listActiveCompetitors: async () => state.competitors
}))

vi.mock('../competitor-coverage', () => ({
  COMPETITOR_COVERAGE_FRESHNESS_DAYS: 30
}))

vi.mock('../entitlement', () => ({
  resolveSeoEntitlement: async () => ({ hasModule: state.hasModule })
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => state.moduleEnabled
}))

vi.mock('../keyword-market-data', () => ({
  deriveLinkBarrier: (input: { avgReferringDomains: number | null; avgPageRank: number | null }) => {
    if (input.avgReferringDomains === null && input.avgPageRank === null) return 'unknown'
    if ((input.avgReferringDomains ?? 0) >= 40) return 'high'
    if ((input.avgReferringDomains ?? 0) >= 10) return 'medium'

    return 'low'
  }
}))

const { readKeywordGap, deriveAttainablePositionBand } = await import('../keyword-gap-reader')

const coverageRow = (keyword: string, competitorRank: number, clientRank: number | null, serp?: string[] | null) => ({
  coverage_run_id: 'seocr-1',
  seo_competitor_id: 'seoc-1',
  keyword,
  competitor_rank: competitorRank,
  competitor_url: `https://rival.cl/${keyword}`,
  client_rank: clientRank,
  serp_item_types: serp === undefined ? null : serp
})

beforeEach(() => {
  state.moduleEnabled = true
  state.hasModule = true
  state.target = [{ organization_id: 'org-1', location_code: '2152', language_code: 'es' }]
  state.runs = [{ seo_competitor_id: 'seoc-1', coverage_run_id: 'seocr-1', capture_date: '2026-08-20', age_days: 8 }]
  state.coverage = []
  state.measured = []
  state.memberships = []
  state.market = []
  state.calls = []
})

describe('readKeywordGap — invariantes del contrato', () => {
  it('🔴 una keyword con impresiones GSC en la ventana NO aparece como gap (● gana sobre ◑)', async () => {
    state.coverage = [coverageRow('medida', 3, null), coverageRow('sin medir', 5, null)]
    state.measured = [{ query: 'medida' }]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    expect(coverage.state).toBe('available')
    if (coverage.state !== 'available') return

    expect(coverage.contentGap.map(row => row.keyword)).toEqual(['sin medir'])
    expect(coverage.excluded.measuredInGsc).toBe(1)
  })

  it('🔴 sin orden propio: listas alfabéticas y cero campo de score en la fila', async () => {
    // Volúmenes deliberadamente INVERSOS al orden alfabético: si el reader ordenara por
    // volumen (o por cualquier score acuñado acá), este test falla.
    state.coverage = [coverageRow('zapato', 2, null), coverageRow('alfombra', 9, null), coverageRow('mueble', 5, null)]
    state.market = [
      { normalized_keyword: 'zapato', search_volume: 90000, cpc_usd: '9', avg_page_rank: null, avg_referring_domains: null, capture_date: '2026-08-15' },
      { normalized_keyword: 'alfombra', search_volume: 10, cpc_usd: '0.1', avg_page_rank: null, avg_referring_domains: null, capture_date: '2026-08-15' }
    ]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')

    expect(coverage.contentGap.map(row => row.keyword)).toEqual(['alfombra', 'mueble', 'zapato'])

    for (const row of coverage.contentGap) {
      expect(row).not.toHaveProperty('score')
      expect(row).not.toHaveProperty('priority')
      expect(row).not.toHaveProperty('valorRecuperable')
    }
  })

  it('separa "no aparezco" de "aparezco peor" y excluye donde el cliente está mejor', async () => {
    state.coverage = [
      coverageRow('no aparezco', 3, null),
      coverageRow('aparezco peor', 4, 12),
      coverageRow('estoy mejor', 9, 2)
    ]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')

    expect(coverage.contentGap.map(row => row.keyword)).toEqual(['no aparezco'])
    expect(coverage.ranksWorse.map(row => row.keyword)).toEqual(['aparezco peor'])
    expect(coverage.ranksWorse[0]).toMatchObject({ classification: 'ranks_worse', clientRank: 12 })
    expect(coverage.excluded.clientBetterOrEqual).toBe(1)
  })

  it('una keyword declarada `target` es compromiso en curso, no hallazgo', async () => {
    state.coverage = [coverageRow('compromiso', 6, null), coverageRow('hallazgo', 7, null)]
    state.memberships = [
      { keyword: 'compromiso', intent: 'target', intent_declared_at: '2026-08-14' },
      { keyword: 'hallazgo', intent: null, intent_declared_at: null }
    ]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')

    expect(coverage.declaredTargets).toEqual([
      { keyword: 'compromiso', intentDeclaredAt: '2026-08-14', competitorRank: 6, clientRank: null }
    ])
    expect(coverage.contentGap.map(row => row.keyword)).toEqual(['hallazgo'])
    // Seguida sin intención declarada = cuarto estado, anotado y distinto de `opportunity`.
    expect(coverage.contentGap[0].clientSetMembership).toEqual({ intent: null })
  })

  it('factores ausentes se declaran sin_dato, nunca 0 ni "baja"', async () => {
    state.coverage = [coverageRow('sin mercado', 5, null, null)]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')

    expect(coverage.contentGap[0].factors).toMatchObject({
      searchVolume: null,
      cpcUsd: null,
      linkBarrier: 'unknown',
      marketAsOf: null,
      serpFeatures: null,
      aiOverviewPresent: null,
      attainablePositionBand: 'sin_dato',
      attainablePositionBasis: 'link_barrier_v1'
    })
  })

  it('las SERP features viajan como lista, no colapsadas a un booleano', async () => {
    state.coverage = [coverageRow('con features', 4, null, ['ai_overview', 'people_also_ask', 'video'])]
    state.market = [
      { normalized_keyword: 'con features', search_volume: 500, cpc_usd: '1.2', avg_page_rank: 10, avg_referring_domains: 5, capture_date: '2026-08-15' }
    ]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')

    expect(coverage.contentGap[0].factors).toMatchObject({
      serpFeatures: ['ai_overview', 'people_also_ask', 'video'],
      aiOverviewPresent: true,
      searchVolume: 500,
      linkBarrier: 'low',
      attainablePositionBand: 'top10_possible',
      marketAsOf: '2026-08-15'
    })
  })

  it('competidor sin cobertura se dice (no_coverage), no se omite', async () => {
    state.runs = []

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.competitors[0].coverage).toEqual({ state: 'no_coverage' })
  })

  it('cobertura vieja se declara stale', async () => {
    state.runs = [{ seo_competitor_id: 'seoc-1', coverage_run_id: 'seocr-1', capture_date: '2026-06-01', age_days: 88 }]
    state.coverage = [coverageRow('vieja', 3, null)]

    const result = await readKeywordGap('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')
    expect(coverage.stale).toBe(true)
  })

  it('el techo por lista se DECLARA en truncated, jamás silencioso', async () => {
    state.coverage = [coverageRow('a', 1, null), coverageRow('b', 2, null), coverageRow('c', 3, null)]

    const result = await readKeywordGap('seot-1', { limit: 2 })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const coverage = result.competitors[0].coverage

    if (coverage.state !== 'available') throw new Error('expected coverage')
    expect(coverage.contentGap).toHaveLength(2)
    expect(coverage.truncated.contentGap).toBe(1)
  })

  it('gates honestos: disabled, target_not_found, no_entitlement', async () => {
    state.moduleEnabled = false
    expect(await readKeywordGap('seot-1')).toMatchObject({ errorCode: 'disabled' })

    state.moduleEnabled = true
    state.target = []
    expect(await readKeywordGap('seot-1')).toMatchObject({ errorCode: 'target_not_found' })

    state.target = [{ organization_id: 'org-1', location_code: '2152', language_code: 'es' }]
    state.hasModule = false
    expect(await readKeywordGap('seot-1')).toMatchObject({ errorCode: 'no_entitlement' })
  })
})

describe('deriveAttainablePositionBand', () => {
  it('mapa puro versionado desde la barrera; unknown jamás degrada a optimista', () => {
    expect(deriveAttainablePositionBand('low')).toBe('top10_possible')
    expect(deriveAttainablePositionBand('medium')).toBe('page2_likely')
    expect(deriveAttainablePositionBand('high')).toBe('blocked_by_links')
    expect(deriveAttainablePositionBand('unknown')).toBe('sin_dato')
  })
})
