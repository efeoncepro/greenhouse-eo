import { describe, expect, it } from 'vitest'

import {
  compareEtvSnapshots,
  compareEtvWithGscBenchmark,
  describeEtvEvaluationMatrix,
  diffEtvMembership,
  dryRunEtvEvaluation,
  estimateEtvCellCostUsd,
  planEtvEvaluation,
  resolveEtvEvaluatorConfig,
  type EtvComparableSnapshot,
  type EtvEvaluationCell
} from '../evaluator'

const BEFORE_CUTOFF = new Date('2026-10-15T12:00:00.000Z')
const AFTER_CUTOFF = new Date('2026-11-03T12:00:00.000Z')

const CELLS: EtvEvaluationCell[] = [
  { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' },
  { subject: 'https://www.berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'ranked_keywords', rowLimit: 100 },
  { subject: 'berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'historical_rank_overview', period: { fromMonth: '2026-05', toMonth: '2026-08' } }
]

const OFF_CONFIG = resolveEtvEvaluatorConfig({} as NodeJS.ProcessEnv)

const ON_CONFIG = resolveEtvEvaluatorConfig({
  GROWTH_SEO_ETV_EVALUATOR_ENABLED: 'true',
  GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST: 'efeoncepro.com, www.berel.com',
  GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS: '10',
  GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD: '1'
} as unknown as NodeJS.ProcessEnv)

describe('TASK-1805 — gate del evaluador', () => {
  it('default: OFF, allowlist vacía, 0 requests, USD 0 (fail-closed)', () => {
    expect(OFF_CONFIG).toEqual({ enabled: false, subjectAllowlist: [], maxRequests: 0, budgetUsd: 0 })
  })

  it('normaliza la allowlist (lowercase, sin www) y coerciona caps', () => {
    expect(ON_CONFIG).toEqual({ enabled: true, subjectAllowlist: ['efeoncepro.com', 'berel.com'], maxRequests: 10, budgetUsd: 1 })
  })
})

describe('TASK-1805 — plan y dry-run (cero llamadas por construcción)', () => {
  it('exact_ab planifica DOS requests por celda, forecast con precios Labs y providerCalls=0', () => {
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'exact_ab', config: ON_CONFIG, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })

    expect(plan.providerCalls).toBe(0)
    expect(plan.plannedRequests).toHaveLength(6)
    expect(plan.requestCount).toBe(6)
    expect(plan.blockedCount).toBe(0)

    const legacyDomain = plan.plannedRequests.find(planned => planned.methodology === 'legacy_static_v1' && planned.cell.familySlug === 'domain_rank_overview')
    const improvedDomain = plan.plannedRequests.find(planned => planned.methodology === 'improved_layout_clickstream_v2' && planned.cell.familySlug === 'domain_rank_overview')

    expect(legacyDomain?.request?.requestParams).toEqual({ use_improved_etv: false })
    expect(improvedDomain?.request?.requestParams).toEqual({ use_improved_etv: true })

    // domain: 0.012 + 1×0.00012 · ranked: 0.012 + 100×0.00012 · historical 4 meses: 0.12 + 4×0.0012 — cada una ×2 fórmulas.
    expect(plan.forecastUsd).toBeCloseTo(2 * (0.01212 + 0.024 + 0.1248), 6)

    const historical = plan.plannedRequests.filter(planned => planned.cell.familySlug === 'historical_rank_overview')

    expect(historical.map(planned => planned.historicalBasis)).toEqual([null, 'calibrated_approximation'])
  })

  it('temporal_canary planifica sólo improved y lo DECLARA como no-paridad', () => {
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'temporal_canary', config: ON_CONFIG, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })

    expect(plan.plannedRequests.every(planned => planned.methodology === 'improved_layout_clickstream_v2')).toBe(true)
    expect(plan.note).toContain('nunca describirla como paridad')
  })

  it('sujeto fuera de la allowlist → bloqueado y sin costo', () => {
    const plan = planEtvEvaluation({
      cells: [{ subject: 'intruso.cl', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' }],
      mode: 'exact_ab',
      config: ON_CONFIG,
      env: {} as NodeJS.ProcessEnv,
      now: BEFORE_CUTOFF
    })

    expect(plan.blockedCount).toBe(2)
    expect(plan.plannedRequests.every(planned => planned.blockedReason === 'subject_not_allowlisted' && planned.estimatedCostUsd === 0)).toBe(true)
    expect(plan.forecastUsd).toBe(0)
  })

  it('después del corte, la mitad legacy del A/B queda bloqueada por policy (no se envía un false que se ignora)', () => {
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'exact_ab', config: ON_CONFIG, env: {} as NodeJS.ProcessEnv, now: AFTER_CUTOFF })

    const legacy = plan.plannedRequests.filter(planned => planned.methodology === 'legacy_static_v1')

    expect(legacy.every(planned => planned.blockedReason === 'legacy_requested_after_cutoff' && planned.request === null)).toBe(true)
    expect(plan.requestCount).toBe(3)
  })

  it('dry-run con gate OFF → wouldExecute=false y razones legibles; providerCalls=0 siempre', () => {
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'exact_ab', config: OFF_CONFIG, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })
    const dry = dryRunEtvEvaluation(plan, OFF_CONFIG)

    expect(dry.providerCalls).toBe(0)
    expect(dry.wouldExecute).toBe(false)
    expect(dry.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('GROWTH_SEO_ETV_EVALUATOR_ENABLED está OFF'), 'allowlist de sujetos vacía'])
    )
  })

  it('dry-run con gate ON y caps holgados → wouldExecute=true, pero sigue siendo papel (providerCalls=0)', () => {
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'exact_ab', config: ON_CONFIG, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })
    const dry = dryRunEtvEvaluation(plan, ON_CONFIG)

    expect(dry.wouldExecute).toBe(true)
    expect(dry.providerCalls).toBe(0)
  })

  it('caps: forecast sobre el tope o requests sobre el máximo → no ejecutable', () => {
    const tight = { ...ON_CONFIG, maxRequests: 2, budgetUsd: 0.01 }
    const plan = planEtvEvaluation({ cells: CELLS, mode: 'exact_ab', config: tight, env: {} as NodeJS.ProcessEnv, now: BEFORE_CUTOFF })
    const dry = dryRunEtvEvaluation(plan, tight)

    expect(plan.caps).toMatchObject({ exceedsRequests: true, exceedsBudget: true })
    expect(dry.wouldExecute).toBe(false)
  })

  it('costo por celda: histórico 10× y por mes', () => {
    expect(estimateEtvCellCostUsd({ subject: 'x.cl', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' })).toBeCloseTo(0.01212, 6)
    expect(
      estimateEtvCellCostUsd({ subject: 'x.cl', locationCode: '2152', languageCode: 'es', familySlug: 'historical_rank_overview', period: { fromMonth: '2026-01', toMonth: '2026-12' } })
    ).toBeCloseTo(0.12 + 12 * 0.0012, 6)
  })

  it('la matriz que se congela antes de gastar nombra 6/3/5', () => {
    const matrix = describeEtvEvaluationMatrix()

    expect(matrix.consumedFamilies).toHaveLength(6)
    expect(matrix.ignoredCallers).toHaveLength(3)
    expect(matrix.notEnabled).toHaveLength(5)
  })
})

const snapshot = (methodology: EtvComparableSnapshot['methodology'], overrides: Partial<EtvComparableSnapshot> = {}): EtvComparableSnapshot => ({
  methodology,
  capturedAt: '2026-10-15',
  organicEtv: 1000,
  paidEtv: 10,
  organicEstimatedTrafficCostUsd: 2000,
  organicCount: 400,
  topItems: [
    { subject: 'a', etv: 500 },
    { subject: 'b', etv: 300 },
    { subject: 'c', etv: 200 }
  ],
  ...overrides
})

describe('TASK-1805 — comparación de snapshots', () => {
  it('deltas por métrica, membresía (Jaccard/entradas/salidas/cambios de rank) y modo declarado', () => {
    const comparison = compareEtvSnapshots({
      legacy: snapshot('legacy_static_v1'),
      improved: snapshot('improved_layout_clickstream_v2', {
        organicEtv: 800,
        organicEstimatedTrafficCostUsd: 1600,
        topItems: [
          { subject: 'a', etv: 450 },
          { subject: 'd', etv: 250 },
          { subject: 'b', etv: 100 }
        ]
      }),
      mode: 'exact_ab'
    })

    expect(comparison.comparability).toBe('simultaneous')
    expect(comparison.organicEtv).toEqual({ legacy: 1000, improved: 800, absolute: -200, relative: -0.2 })
    expect(comparison.organicCount.absolute).toBe(0)
    expect(comparison.membership).toEqual({
      jaccard: 0.5,
      entries: ['d'],
      exits: ['c'],
      shared: 2,
      rankChanges: [{ subject: 'b', legacyRank: 2, improvedRank: 3 }]
    })
  })

  it('un canary temporal se rotula temporal, nunca simultáneo', () => {
    const comparison = compareEtvSnapshots({ legacy: snapshot('legacy_static_v1'), improved: snapshot('improved_layout_clickstream_v2'), mode: 'temporal_canary' })

    expect(comparison.comparability).toBe('temporal')
  })

  it('el tráfico del prospecto compara la suma y declara truncamiento por lado', () => {
    const comparison = compareEtvSnapshots({
      legacy: snapshot('legacy_static_v1', { prospectTraffic: { sum: 219006, sampleRows: 1000, rowLimit: 1000, truncated: true } }),
      improved: snapshot('improved_layout_clickstream_v2', { prospectTraffic: { sum: 180000, sampleRows: 1000, rowLimit: 1000, truncated: true } }),
      mode: 'exact_ab'
    })

    expect(comparison.prospectTraffic).toMatchObject({ legacy: 219006, improved: 180000, legacyTruncated: true, improvedTruncated: true })
  })

  it('comparar dos snapshots del mismo método es un error de input, no un resultado', () => {
    expect(() =>
      compareEtvSnapshots({ legacy: snapshot('legacy_static_v1'), improved: snapshot('legacy_static_v1'), mode: 'exact_ab' })
    ).toThrowError(/exige un snapshot legacy y uno improved/)
  })

  it('valores nulos no producen deltas fantasma', () => {
    expect(diffEtvMembership([], []).jaccard).toBeNull()
    const comparison = compareEtvSnapshots({ legacy: snapshot('legacy_static_v1', { organicEtv: null }), improved: snapshot('improved_layout_clickstream_v2'), mode: 'exact_ab' })

    expect(comparison.organicEtv).toEqual({ legacy: null, improved: 1000, absolute: null, relative: null })
  })
})

describe('TASK-1805 — benchmark GSC (se compara, nunca se promedia)', () => {
  it('error absoluto/relativo por fórmula y cuál queda más cerca; sin inventar un promedio', () => {
    const calibration = compareEtvWithGscBenchmark({ gscClicks: 700, legacyEtv: 1000, improvedEtv: 760 })

    expect(calibration.legacy).toEqual({ absoluteError: 300, relativeError: 0.428571, direction: 'over' })
    expect(calibration.improved).toEqual({ absoluteError: 60, relativeError: 0.085714, direction: 'over' })
    expect(calibration.closer).toBe('improved_layout_clickstream_v2')
    expect(Object.keys(calibration)).toEqual(['legacy', 'improved', 'closer'])
  })

  it('falta una fórmula → closer=null; GSC en cero → error relativo null', () => {
    expect(compareEtvWithGscBenchmark({ gscClicks: 0, legacyEtv: 10, improvedEtv: null })).toMatchObject({
      legacy: { absoluteError: 10, relativeError: null, direction: 'over' },
      improved: { absoluteError: null, relativeError: null, direction: null },
      closer: null
    })
  })
})
