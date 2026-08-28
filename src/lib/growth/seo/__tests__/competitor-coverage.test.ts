import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1662 Slice 2 — captura de cobertura de competidores.
 *
 * Foco: el contrato de gasto (flag OFF, frescura por run ledger, gate antes de la primera
 * llamada, fallo per-task JAMÁS disfrazado de "cero filas", veredicto persistido siempre) y
 * el parser puro del item de `domain_intersection`. El SQL se ejercita contra PG real en el
 * sanity de la task (gate TASK-893).
 */

vi.mock('server-only', () => ({}))
vi.mock('../register-provider-spend', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  moduleEnabled: true,
  gapEnabled: true,
  competitor: [
    {
      seo_competitor_id: 'seoc-1',
      seo_target_id: 'seot-1',
      competitor_domain: 'rival.cl',
      organization_id: 'org-1',
      root_domain: 'cliente.cl',
      location_code: '2152',
      language_code: 'es'
    }
  ] as Array<Record<string, unknown>>,
  fresh: false,
  gateAllowed: true,
  eligible: [{ seo_competitor_id: 'seoc-1' }, { seo_competitor_id: 'seoc-2' }] as Array<Record<string, unknown>>,
  providerResponses: [] as Array<{ ok: boolean; cost: number; tasks: unknown[] }>,
  providerCalls: [] as Array<Record<string, unknown>>,
  calls: [] as QueryCall[],
  marketPersisted: [] as unknown[],
  freshMarketKeywords: new Set<string>()
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    state.calls.push({ sql, params })

    if (sql.includes('JOIN greenhouse_growth.seo_targets t') && sql.includes('c.seo_competitor_id = $1')) {
      return state.competitor
    }

    if (sql.includes('SELECT EXISTS')) {
      return [{ fresh: state.fresh }]
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_competitor_coverage_runs')) {
      return [{ coverage_run_id: 'seocr-1' }]
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_competitor_keyword_coverage')) {
      return []
    }

    if (sql.includes('NOT EXISTS')) {
      return state.eligible
    }

    return []
  }
}))

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: async (input: Record<string, unknown>) => {
    state.providerCalls.push(input)

    const next = state.providerResponses.shift()

    if (!next) throw new Error('no_scripted_response')

    return { ...next, httpStatus: 200 }
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('../entitlement', () => ({
  enforceSeoRunEntitlement: async () => ({
    allowed: state.gateAllowed,
    blockedReason: state.gateAllowed ? null : 'budget_exhausted'
  })
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => state.moduleEnabled,
  isSeoCompetitorGapEnabled: () => state.gapEnabled
}))

vi.mock('../keyword-market-data', () => ({
  loadFreshMarketKeywords: async () => state.freshMarketKeywords,
  persistKeywordMarketData: async (input: { data: unknown[] }) => {
    state.marketPersisted.push(...input.data)

    return { rowsWritten: input.data.length }
  },
  parseKeywordOverviewItem: (item: { keyword?: string }) =>
    item.keyword ? { normalizedKeyword: item.keyword.toLowerCase(), keyword: item.keyword } : null
}))

const {
  captureCompetitorCoverage,
  estimateCompetitorCoverageCost,
  parseDomainIntersectionItem,
  runCompetitorCoverageBatch
} = await import('../competitor-coverage')

const providerTask = (items: unknown[], statusCode = 20000) => ({
  ok: true,
  cost: 0.05,
  tasks: [{ status_code: statusCode, result: [{ items }] }]
})

const intersectionItem = (keyword: string, competitorRank: number, clientRank: number | null) => ({
  keyword_data: {
    keyword,
    keyword_info: {},
    serp_info: { serp_item_types: ['organic', 'ai_overview'] }
  },
  first_domain_serp_element: { serp_item: { rank_group: competitorRank, url: `https://rival.cl/${keyword}` } },
  second_domain_serp_element: clientRank === null ? null : { serp_item: { rank_group: clientRank } }
})

beforeEach(() => {
  state.moduleEnabled = true
  state.gapEnabled = true
  state.fresh = false
  state.gateAllowed = true
  state.providerResponses = []
  state.providerCalls = []
  state.calls = []
  state.marketPersisted = []
  state.freshMarketKeywords = new Set()
  state.competitor = [
    {
      seo_competitor_id: 'seoc-1',
      seo_target_id: 'seot-1',
      competitor_domain: 'rival.cl',
      organization_id: 'org-1',
      root_domain: 'cliente.cl',
      location_code: '2152',
      language_code: 'es'
    }
  ]
  state.eligible = [{ seo_competitor_id: 'seoc-1' }, { seo_competitor_id: 'seoc-2' }]
})

describe('estimateCompetitorCoverageCost', () => {
  it('dos llamadas al peor caso: setup + filas', () => {
    const estimate = estimateCompetitorCoverageCost(500)

    expect(estimate.providerCalls).toBe(2)
    expect(estimate.estimatedCostUsd).toBeCloseTo(2 * (0.012 + 500 * 0.00012), 6)
  })
})

describe('parseDomainIntersectionItem', () => {
  const context = { locationCode: '2152', languageCode: 'es' }

  it('extrae posiciones (envueltas en serp_item o directas) y features ordenadas', () => {
    const wrapped = parseDomainIntersectionItem(intersectionItem('pintura', 3, 14), context)

    expect(wrapped).toMatchObject({
      keyword: 'pintura',
      competitorRank: 3,
      clientRank: 14,
      serpItemTypes: ['ai_overview', 'organic']
    })

    const direct = parseDomainIntersectionItem(
      {
        keyword_data: { keyword: 'esmalte' },
        first_domain_serp_element: { rank_group: 7, url: 'https://rival.cl/e' }
      },
      context
    )

    expect(direct).toMatchObject({ keyword: 'esmalte', competitorRank: 7, clientRank: null, serpItemTypes: null })
  })

  it('sin keyword o sin posición del competidor no hay hecho', () => {
    expect(parseDomainIntersectionItem({ keyword_data: { keyword: '' } }, context)).toBeNull()
    expect(parseDomainIntersectionItem({ keyword_data: { keyword: 'x' } }, context)).toBeNull()
  })
})

describe('captureCompetitorCoverage', () => {
  it('flag OFF → disabled sin una sola llamada al proveedor', async () => {
    state.gapEnabled = false

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toEqual({ status: 'disabled' })
    expect(state.providerCalls).toHaveLength(0)
  })

  it('captura fresca → skip sin gastar (variante de frescura TASK-1661)', async () => {
    state.fresh = true

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toMatchObject({ status: 'skipped_fresh' })
    expect(state.providerCalls).toHaveLength(0)
  })

  it('gate bloqueado → budget_blocked antes de la primera llamada', async () => {
    state.gateAllowed = false

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toMatchObject({ status: 'budget_blocked', blockedReason: 'budget_exhausted' })
    expect(state.providerCalls).toHaveLength(0)
  })

  it('fallo per-task se persiste como run failed, nunca como cero filas', async () => {
    state.providerResponses = [providerTask([], 40501)]

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toMatchObject({ status: 'failed', errorCode: 'task_status_40501' })
    // La segunda llamada NO se dispara si la primera reventó.
    expect(state.providerCalls).toHaveLength(1)

    const runInsert = state.calls.find(c => c.sql.includes('INSERT INTO greenhouse_growth.seo_competitor_coverage_runs'))

    expect(runInsert?.params).toContain('failed')
    expect(runInsert?.params).toContain('task_status_40501')
  })

  it('captura feliz: dos llamadas, run + filas + mercado a costo 0', async () => {
    state.providerResponses = [
      providerTask([intersectionItem('gap uno', 3, null), intersectionItem('gap dos', 8, null)]),
      providerTask([intersectionItem('solapada', 2, 15)])
    ]

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toMatchObject({
      status: 'captured',
      rowsWritten: 3,
      contentGapRows: 2,
      overlapRows: 1,
      marketRowsWritten: 3,
      providerCostUsd: 0.1
    })

    // target1 = COMPETIDOR, target2 = CLIENTE; intersections false y luego true.
    const [first, second] = state.providerCalls as Array<{ tasks: Array<Record<string, unknown>> }>

    expect(first.tasks[0]).toMatchObject({ target1: 'rival.cl', target2: 'cliente.cl', intersections: false })
    expect(second.tasks[0]).toMatchObject({ intersections: true })

    const coverageInserts = state.calls.filter(c => c.sql.includes('seo_competitor_keyword_coverage'))

    expect(coverageInserts).toHaveLength(3)
  })

  it('el pre-check de frescura del mercado evita re-escribir lo ya fresco', async () => {
    state.freshMarketKeywords = new Set(['gap uno'])
    state.providerResponses = [providerTask([intersectionItem('gap uno', 3, null)]), providerTask([])]

    const result = await captureCompetitorCoverage('seoc-1')

    expect(result).toMatchObject({ status: 'captured', rowsWritten: 1, marketRowsWritten: 0 })
    expect(state.marketPersisted).toHaveLength(0)
  })
})

describe('runCompetitorCoverageBatch', () => {
  it('V1: un competidor por corrida por default aunque haya más elegibles', async () => {
    state.providerResponses = [providerTask([]), providerTask([])]

    const summary = await runCompetitorCoverageBatch()

    expect(summary.eligible).toBe(2)
    expect(summary.attempted).toBe(1)
  })

  it('flag OFF → disabled sin tocar la base del proveedor', async () => {
    state.gapEnabled = false

    const summary = await runCompetitorCoverageBatch()

    expect(summary.status).toBe('disabled')
    expect(state.providerCalls).toHaveLength(0)
  })

  it('dryRun reporta el costo estimado sin llamar al proveedor', async () => {
    const summary = await runCompetitorCoverageBatch({ dryRun: true })

    expect(summary.attempted).toBe(1)
    expect(summary.outcomes[0]).toMatchObject({ status: 'dry_run' })
    expect(state.providerCalls).toHaveLength(0)
  })
})
