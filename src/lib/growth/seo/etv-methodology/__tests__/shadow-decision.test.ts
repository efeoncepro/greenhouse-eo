import { describe, expect, it } from 'vitest'

/**
 * TASK-1806 Slice 2 — Decisor del shadow legacy/improved ETV (puro: sin mocks de IO).
 *
 * Un caso por regla del preregistro §5: go_rebaseline, go_breakpoint por Jaccard < 0,8, go_breakpoint por
 * discontinuidad histórica, hold por > 2 celdas inválidas, hold por GSC no comparable en Berel, no_go por
 * calibración peor en Berel, hallazgo bloqueante ±40 % sin cambio de count, hallazgo prospecto ±30 %,
 * Efeonce CL no veta ni certifica, y el render Markdown sin credenciales y con la regla de no promediar.
 */

import type { EtvComparableSnapshot } from '../evaluator'
import {
  decideEtvShadow,
  deriveEtvShadowOperability,
  evaluateEtvShadowCell,
  PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03 as T,
  resolveEtvShadowGscWindow,
  type EtvShadowCellEvaluation,
  type EtvShadowCellInput,
  type EtvShadowRunRequest
} from '../shadow-decision'
import { renderEtvShadowReportMarkdown, type EtvShadowEvaluationResult } from '../shadow-report-markdown'

const WINDOW = resolveEtvShadowGscWindow({ evaluationDate: '2026-10-20', locationCode: '2484', thresholds: T })!

const snapshot = (methodology: EtvComparableSnapshot['methodology'], overrides: Partial<EtvComparableSnapshot> = {}): EtvComparableSnapshot => ({
  methodology,
  capturedAt: '2026-10-15T10:00:00.000Z',
  organicEtv: 135000,
  paidEtv: 100,
  organicEstimatedTrafficCostUsd: 20000,
  organicCount: 773,
  topItems: [],
  ...overrides
})

const items = (...subjects: string[]) => subjects.map((subject, index) => ({ subject, etv: 1000 - index }))

type CellSpec = Omit<EtvShadowCellInput, 'thresholds' | 'mode'> & { mode?: EtvShadowCellInput['mode'] }

const cell = (spec: CellSpec): EtvShadowCellEvaluation => evaluateEtvShadowCell({ mode: 'exact_ab', thresholds: T, ...spec })

const berel = (familySlug: EtvShadowCellInput['cell']['familySlug'], extra: Partial<EtvShadowCellInput['cell']> = {}) => ({
  subject: 'berel.com',
  locationCode: '2484',
  languageCode: 'es',
  familySlug,
  ...extra
})

const gsc = (windowClicks: number): EtvShadowCellInput['gsc'] => ({ status: 'comparable', siteUrl: 'sc-domain:berel.com', window: WINDOW, windowClicks })

/** Cohorte mínima "sana": foto de Berel donde improved calibra mejor, membresía estable, historia continua. */
const healthyCells = (): EtvShadowCellEvaluation[] => [
  // GSC 112.000 clics en 28 d → 120.000/mes. legacy 135.000 (err 12,5 %), improved 118.000 (err 1,7 %) → improved más cerca.
  cell({
    cellIndex: 1,
    cell: berel('domain_rank_overview'),
    legacy: snapshot('legacy_static_v1'),
    improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 118000, organicCount: 770 }),
    legacyHasData: true,
    improvedHasData: true,
    gsc: gsc(112000)
  }),
  cell({
    cellIndex: 3,
    cell: berel('relevant_pages', { rowLimit: 100 }),
    legacy: snapshot('legacy_static_v1', { organicEtv: null, topItems: items('berel.com', 'berel.com/productos', 'berel.com/ubica-tienda', 'berel.com/colores', 'berel.com/blog') }),
    improved: snapshot('improved_layout_clickstream_v2', { organicEtv: null, topItems: items('berel.com', 'berel.com/productos', 'berel.com/colores', 'berel.com/ubica-tienda', 'berel.com/blog') }),
    legacyHasData: true,
    improvedHasData: true,
    gsc: gsc(112000)
  }),
  cell({
    cellIndex: 4,
    cell: berel('subdomains', { rowLimit: 100 }),
    legacy: snapshot('legacy_static_v1', { organicEtv: null, topItems: items('www.berel.com', 'tienda.berel.com') }),
    improved: snapshot('improved_layout_clickstream_v2', { organicEtv: null, topItems: items('www.berel.com', 'tienda.berel.com') }),
    legacyHasData: true,
    improvedHasData: true,
    gsc: gsc(112000)
  }),
  cell({
    cellIndex: 5,
    cell: berel('historical_rank_overview', { period: { fromMonth: '2026-04', toMonth: '2026-09' } }),
    legacy: snapshot('legacy_static_v1', { organicEtv: 130000 }),
    improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 117000, historicalBasis: 'fully_recomputed' }),
    legacyHasData: true,
    improvedHasData: true,
    historical: {
      legacy: [
        { month: '2026-04', organicEtv: 100000 },
        { month: '2026-05', organicEtv: 105000 },
        { month: '2026-06', organicEtv: 110000 },
        { month: '2026-07', organicEtv: 120000 },
        { month: '2026-08', organicEtv: 125000 },
        { month: '2026-09', organicEtv: 130000 }
      ],
      // ratio ~0,90 estable: sin discontinuidad.
      improved: [
        { month: '2026-04', organicEtv: 90000, basis: 'calibrated_approximation' },
        { month: '2026-05', organicEtv: 94500, basis: 'calibrated_approximation' },
        { month: '2026-06', organicEtv: 99000, basis: 'calibrated_approximation' },
        { month: '2026-07', organicEtv: 108000, basis: 'fully_recomputed' },
        { month: '2026-08', organicEtv: 112500, basis: 'fully_recomputed' },
        { month: '2026-09', organicEtv: 117000, basis: 'fully_recomputed' }
      ]
    }
  })
]

const codes = (decision: ReturnType<typeof decideEtvShadow>) => decision.findings.map(finding => finding.code)

describe('TASK-1806 — umbrales preregistrados', () => {
  it('son exactamente los del preregistro 2026-09-03 y están congelados', () => {
    expect(T.gscRelativeErrorMaxWorseningPoints).toBe(10)
    expect(T.membershipJaccardRebaselineMin).toBe(0.8)
    expect(T.organicEtvMaxRegressionRatio).toBe(0.4)
    expect(T.prospectMagnitudeChangeRatio).toBe(0.3)
    expect(T.invalidCellsHoldAbove).toBe(2)
    expect(T.historicalBreak).toEqual({ beforeMonth: '2026-06', afterMonth: '2026-07' })
    expect(T.calibrationSubject).toBe('berel.com')
    expect(T.edgeSubjects).toEqual(['efeoncepro.com'])
    expect(Object.isFrozen(T)).toBe(true)
  })

  it('la ventana GSC termina 2 días antes de la evaluación, dura 28 días y normaliza ×30/28', () => {
    expect(WINDOW).toEqual({ startDate: '2026-09-21', endDate: '2026-10-18', days: 28, country: 'mex', monthlyNormalizationFactor: 1.071429 })
    expect(resolveEtvShadowGscWindow({ evaluationDate: '2026-10-20', locationCode: '9999', thresholds: T })).toBeNull()
  })
})

describe('TASK-1806 — decisión §5.6', () => {
  it('go_rebaseline: calibración cumple en Berel, Jaccard ≥ 0,8 y historia continua', () => {
    const decision = decideEtvShadow(healthyCells(), T)

    expect(decision.decision).toBe('go_rebaseline')
    expect(decision.historicalTreatment).toBe('rebaseline')
    expect(codes(decision)).toEqual(expect.arrayContaining(['calibration_improved_or_tie', 'membership_stable', 'historical_continuous']))
    expect(decision.findings.filter(finding => finding.severity === 'blocking')).toHaveLength(0)
    expect(decision.rationale.join(' ')).toContain('nunca se promedia')
  })

  it('go_breakpoint por Jaccard < 0,8 en relevant_pages de Berel aunque la calibración mejore', () => {
    const cells = healthyCells()

    cells[1] = cell({
      cellIndex: 3,
      cell: berel('relevant_pages', { rowLimit: 100 }),
      legacy: snapshot('legacy_static_v1', { organicEtv: null, topItems: items('berel.com', 'berel.com/productos', 'berel.com/ubica-tienda', 'berel.com/colores', 'berel.com/blog') }),
      // 3 de 5 compartidos → 3/7 = 0,43.
      improved: snapshot('improved_layout_clickstream_v2', { organicEtv: null, topItems: items('berel.com', 'berel.com/productos', 'berel.com/colores', 'berel.com/promociones', 'berel.com/tips') }),
      legacyHasData: true,
      improvedHasData: true,
      gsc: gsc(112000)
    })

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('go_breakpoint')
    expect(decision.historicalTreatment).toBe('breakpoint')
    expect(decision.findings.find(finding => finding.code === 'membership_shift_requires_breakpoint')?.cell).toBe(3)
  })

  it('go_breakpoint por discontinuidad histórica 2026-06→2026-07 mayor que la variación mensual mediana legacy', () => {
    const cells = healthyCells()
    const historical = cells[3].historical!

    // El ratio pasa de 0,90 (junio) a 1,30 (julio): salto 44 % vs mediana legacy ~4,8 %.
    historical.improved = historical.improved.map(point => (point.month >= '2026-07' ? { ...point, organicEtv: Math.round((point.organicEtv as number) * 1.444) } : point))

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('go_breakpoint')
    expect(codes(decision)).toContain('historical_discontinuity')
    expect(codes(decision)).not.toContain('membership_shift_requires_breakpoint')
  })

  it('hold por > 2 celdas inválidas (status ≠ 20000 / snapshot ausente / inputs no equivalentes)', () => {
    const cells = healthyCells()

    const broken = (cellIndex: number, familySlug: EtvShadowCellInput['cell']['familySlug'], operability: EtvShadowCellInput['operability']) =>
      cell({
        cellIndex,
        cell: { subject: 'comex.com.mx', locationCode: '2484', languageCode: 'es', familySlug },
        legacy: snapshot('legacy_static_v1'),
        improved: snapshot('improved_layout_clickstream_v2'),
        legacyHasData: true,
        improvedHasData: true,
        operability
      })

    const ok = { statusCode: 20000, ok: true, latencyMs: 900, costUsd: 0.012 }

    cells.push(
      broken(6, 'domain_rank_overview', { legacy: ok, improved: { ...ok, statusCode: 40501 }, inputsEquivalent: true }),
      broken(7, 'ranked_keywords', { legacy: ok, improved: ok, inputsEquivalent: false }),
      cell({ cellIndex: 8, cell: { subject: 'comex.com.mx', locationCode: '2484', languageCode: 'es', familySlug: 'relevant_pages' }, legacy: snapshot('legacy_static_v1'), improved: null })
    )

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('hold')
    expect(decision.historicalTreatment).toBeNull()
    expect(codes(decision)).toContain('invalid_cells_exceeded')
    expect(decision.findings.filter(finding => finding.code === 'cell_invalid').map(finding => finding.cell)).toEqual([6, 7, 8])
  })

  it('hold cuando GSC no es comparable en Berel (aunque Efeonce CL sí compare)', () => {
    const cells = healthyCells().map(evaluation => (evaluation.cellIndex === 1 ? { ...evaluation, gsc: { status: 'not_comparable' as const, reason: 'token_unhealthy' as const } } : evaluation))

    cells.push(
      cell({
        cellIndex: 9,
        cell: { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' },
        legacy: snapshot('legacy_static_v1', { organicEtv: 5, organicCount: 5 }),
        improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 4, organicCount: 5 }),
        legacyHasData: true,
        improvedHasData: true,
        gsc: { status: 'comparable', siteUrl: 'sc-domain:efeoncepro.com', window: { ...WINDOW, country: 'chl' }, windowClicks: 4 }
      })
    )

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('hold')
    expect(codes(decision)).toContain('gsc_not_comparable_in_calibration_subject')
    // Efeonce comparó "mejor" y aun así no certifica: su celda sólo deja un hallazgo info.
    expect(decision.findings.find(finding => finding.cell === 9)?.severity).toBe('info')
  })

  it('no_go cuando improved empeora la calibración en la foto de Berel', () => {
    const cells = healthyCells()

    // GSC 120.000/mes. legacy 135.000 (err 12,5 %), improved 180.000 (err 50 %) → legacy más cerca, +37,5 pp.
    cells[0] = cell({
      cellIndex: 1,
      cell: berel('domain_rank_overview'),
      legacy: snapshot('legacy_static_v1'),
      improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 180000, organicCount: 1050 }),
      legacyHasData: true,
      improvedHasData: true,
      gsc: gsc(112000)
    })

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('no_go')
    expect(decision.historicalTreatment).toBeNull()
    expect(decision.findings.find(finding => finding.code === 'calibration_worse_in_calibration_subject')).toMatchObject({ severity: 'blocking', cell: 1 })
  })

  it('en una celda secundaria de Berel, legacy más cerca por ≤ 10 pp se declara sin bloquear; > 10 pp es no_go', () => {
    const secondary = (improvedEtv: number) =>
      cell({
        cellIndex: 2,
        cell: berel('ranked_keywords', { rowLimit: 100 }),
        legacy: snapshot('legacy_static_v1', { organicEtv: 126000 }), // err 5 %
        improved: snapshot('improved_layout_clickstream_v2', { organicEtv: improvedEtv }),
        legacyHasData: true,
        improvedHasData: true,
        gsc: gsc(112000)
      })

    // improved 132.000 → err 10 % → +5 pp: dentro de tolerancia.
    const within = decideEtvShadow([...healthyCells(), secondary(132000)], T)

    expect(within.decision).toBe('go_rebaseline')
    expect(codes(within)).toContain('calibration_regression_within_tolerance')

    // improved 144.000 → err 20 % → +15 pp: fuera de tolerancia.
    const beyond = decideEtvShadow([...healthyCells(), secondary(144000)], T)

    expect(beyond.decision).toBe('no_go')
    expect(codes(beyond)).toContain('calibration_regression_exceeds_tolerance')
  })

  it('hallazgo bloqueante: ETV orgánico de Berel cambia > ±40 % sin cambio equivalente de organic.count → hold', () => {
    const cells = healthyCells()

    // GSC 120.000/mes. legacy 200.000 (err 67 %), improved 110.000 (err 8 %) → improved calibra mejor (−45 %) pero count casi no cambia.
    cells[0] = cell({
      cellIndex: 1,
      cell: berel('domain_rank_overview'),
      legacy: snapshot('legacy_static_v1', { organicEtv: 200000, organicCount: 773 }),
      improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 110000, organicCount: 760 }),
      legacyHasData: true,
      improvedHasData: true,
      gsc: gsc(112000)
    })

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('hold')
    expect(decision.findings.find(finding => finding.code === 'etv_regression_without_count_change')).toMatchObject({ severity: 'blocking', cell: 1 })
    expect(codes(decision)).toContain('calibration_improved_or_tie')

    // Con cambio equivalente de count (mismo signo, ≥ 50 % del cambio de ETV) el go se mantiene.
    cells[0] = cell({
      cellIndex: 1,
      cell: berel('domain_rank_overview'),
      legacy: snapshot('legacy_static_v1', { organicEtv: 200000, organicCount: 773 }),
      improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 110000, organicCount: 540 }),
      legacyHasData: true,
      improvedHasData: true,
      gsc: gsc(112000)
    })

    expect(decideEtvShadow(cells, T).decision).toBe('go_rebaseline')
  })

  it('hallazgo prospecto > ±30 % se declara como aviso y NO cambia la decisión', () => {
    const cells = healthyCells()

    cells.push(
      cell({
        cellIndex: 12,
        cell: { subject: 'comex.com.mx', locationCode: '2484', languageCode: 'es', familySlug: 'ranked_keywords', rowLimit: 1000, purpose: 'prospect' },
        legacy: snapshot('legacy_static_v1', { organicEtv: null, organicCount: 1000, prospectTraffic: { sum: 880000, sampleRows: 1000, rowLimit: 1000, truncated: true } }),
        improved: snapshot('improved_layout_clickstream_v2', { organicEtv: null, organicCount: 1000, prospectTraffic: { sum: 560000, sampleRows: 1000, rowLimit: 1000, truncated: true } }),
        legacyHasData: true,
        improvedHasData: true,
        gsc: { status: 'not_applicable', reason: 'competitor' }
      })
    )

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('go_rebaseline')
    expect(decision.findings.find(finding => finding.code === 'prospect_magnitude_shift')).toMatchObject({ severity: 'warning', cell: 12 })
  })

  it('Efeonce CL (borde) no veta: su calibración peor y su Jaccard bajo sólo dejan hallazgos info', () => {
    const cells = healthyCells()

    cells.push(
      cell({
        cellIndex: 9,
        cell: { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' },
        legacy: snapshot('legacy_static_v1', { organicEtv: 5, organicCount: 5 }),
        improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 40, organicCount: 5 }), // +700 % y calibra peor
        legacyHasData: true,
        improvedHasData: true,
        gsc: { status: 'comparable', siteUrl: 'sc-domain:efeoncepro.com', window: { ...WINDOW, country: 'chl' }, windowClicks: 4 }
      }),
      cell({
        cellIndex: 10,
        cell: { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'ranked_keywords', rowLimit: 100 },
        legacy: snapshot('legacy_static_v1', { organicEtv: 5, organicCount: 5, topItems: items('a', 'b', 'c') }),
        improved: snapshot('improved_layout_clickstream_v2', { organicEtv: 5, organicCount: 5, topItems: items('x', 'y', 'z') }),
        legacyHasData: true,
        improvedHasData: true,
        gsc: { status: 'comparable', siteUrl: 'sc-domain:efeoncepro.com', window: { ...WINDOW, country: 'chl' }, windowClicks: 4 }
      })
    )

    const decision = decideEtvShadow(cells, T)

    expect(decision.decision).toBe('go_rebaseline')
    expect(decision.findings.filter(finding => finding.cell === 9 || finding.cell === 10).every(finding => finding.severity === 'info' && finding.code === 'edge_subject_observation')).toBe(true)
    expect(cells[cells.length - 1].role).toBe('edge')
  })

  it('celda con una sola fórmula queda inválida sin comparación y un temporal_canary nunca calibra', () => {
    const only = cell({ cellIndex: 1, cell: berel('domain_rank_overview'), legacy: snapshot('legacy_static_v1'), improved: null, gsc: gsc(112000) })

    expect(only.validity).toEqual({ valid: false, reasons: ['snapshot_missing:improved'] })
    expect(only.comparison).toBeNull()

    const canary = cell({
      cellIndex: 1,
      cell: berel('domain_rank_overview'),
      mode: 'temporal_canary',
      legacy: snapshot('legacy_static_v1'),
      improved: snapshot('improved_layout_clickstream_v2'),
      legacyHasData: true,
      improvedHasData: true
    })

    expect(canary.validity.reasons).toContain('temporal_canary_not_ab')
    expect(canary.comparison?.comparability).toBe('temporal')
  })

  it('costo real fuera de ±5 % del forecast deja un aviso sin cambiar la decisión', () => {
    const decision = decideEtvShadow(healthyCells(), T, { cost: { forecastUsd: 1.02, realUsd: 1.3 } })

    expect(decision.decision).toBe('go_rebaseline')
    expect(codes(decision)).toContain('cost_deviates_from_forecast')
  })
})

describe('TASK-1806 — operabilidad desde summary.json', () => {
  const request = (methodology: EtvShadowRunRequest['methodology'], overrides: Partial<EtvShadowRunRequest> = {}): EtvShadowRunRequest => ({
    cellIndex: 1,
    familySlug: 'domain_rank_overview',
    subject: 'berel.com',
    locationCode: '2484',
    languageCode: 'es',
    methodology,
    requested: methodology,
    providerEffective: methodology,
    requestedAt: '2026-10-15T10:00:00.000Z',
    taskHashWithoutFlag: 'h1',
    statusCode: 20000,
    ok: true,
    costUsd: 0.01212,
    latencyMs: 800,
    persisted: { table: 'greenhouse_growth.seo_domain_overview_snapshots', rows: 1, conflict: 0 },
    historicalBasis: null,
    ...overrides
  })

  it('inputs equivalentes = mismo hash sin flag y requested = providerEffective en ambas', () => {
    expect(deriveEtvShadowOperability([request('legacy_static_v1'), request('improved_layout_clickstream_v2')], 1)?.inputsEquivalent).toBe(true)
    expect(deriveEtvShadowOperability([request('legacy_static_v1'), request('improved_layout_clickstream_v2', { taskHashWithoutFlag: 'h2' })], 1)?.inputsEquivalent).toBe(false)
    expect(deriveEtvShadowOperability([request('legacy_static_v1'), request('improved_layout_clickstream_v2', { providerEffective: 'legacy_static_v1' })], 1)?.inputsEquivalent).toBe(false)
    expect(deriveEtvShadowOperability([request('legacy_static_v1')], 1)?.inputsEquivalent).toBe(false)
    expect(deriveEtvShadowOperability([], 1)).toBeNull()

    // `already_captured`: la fila del día ya existía, no hubo request → sin hash → equivalencia desconocida (null), no falsa.
    const cached = request('legacy_static_v1', { status: 'already_captured', taskHashWithoutFlag: null, requested: null, providerEffective: null, requestedAt: null, statusCode: null, latencyMs: null, costUsd: 0 })
    const operability = deriveEtvShadowOperability([cached, request('improved_layout_clickstream_v2')], 1)

    expect(operability?.inputsEquivalent).toBeNull()
    expect(operability?.legacy).toEqual({ statusCode: null, ok: true, latencyMs: null, costUsd: 0 })
    expect(cell({ cellIndex: 1, cell: berel('domain_rank_overview'), legacy: snapshot('legacy_static_v1'), improved: snapshot('improved_layout_clickstream_v2'), legacyHasData: true, improvedHasData: true, operability }).validity.valid).toBe(true)
  })
})

describe('TASK-1806 — artefacto Markdown', () => {
  const result = (): EtvShadowEvaluationResult => {
    const cells = healthyCells()

    return {
      cohortId: '2026-09-03-preregistered',
      runId: 'run-001',
      captureDate: '2026-10-15',
      evaluationDate: '2026-10-20',
      mode: 'exact_ab',
      thresholds: T,
      cells,
      decision: decideEtvShadow(cells, T, { cost: { forecastUsd: 1.02, realUsd: 1.0 } }),
      inputsEquivalent: true,
      cost: { forecastUsd: 1.02, realUsd: 1.0 },
      latency: {
        requests: 8,
        meanMs: 900,
        maxMs: 1500,
        byMethodology: { legacy_static_v1: { requests: 4, meanMs: 850, maxMs: 1200 }, improved_layout_clickstream_v2: { requests: 4, meanMs: 950, maxMs: 1500 } }
      },
      declarations: ['GSC es benchmark first-party: se compara error, dirección y cercanía por celda; NUNCA se promedia GSC con ETV.']
    }
  }

  it('declara que no se promedia, la ventana GSC y la normalización, y va celda por celda', () => {
    const markdown = renderEtvShadowReportMarkdown(result())

    expect(markdown.toLowerCase()).toContain('no se promedia')
    expect(markdown).toContain('2026-09-21..2026-10-18')
    expect(markdown).toContain('×30/28')
    expect(markdown).toContain('go + rebaseline')
    expect(markdown).toContain('| 1 | berel.com | domain_rank_overview |')
    expect(markdown).toContain('| 3 | berel.com | relevant_pages |')
    expect(markdown).toContain('| 2026-07 |')
    expect(markdown).toContain('calibrated_approximation')
    expect(markdown).toContain('NO autoriza cutover')
  })

  it('no imprime nada parecido a un token, credencial o payload', () => {
    const markdown = renderEtvShadowReportMarkdown(result())

    expect(markdown).not.toMatch(/sk-[a-z0-9]{8,}/i)
    expect(markdown).not.toMatch(/ya29\./)
    expect(markdown).not.toMatch(/bearer\s+[a-z0-9._-]{10,}/i)
    expect(markdown).not.toMatch(/(api[_-]?key|password|secret|refresh[_-]?token|access[_-]?token|authorization)\s*[:=]/i)
    expect(markdown).not.toMatch(/"tasks"\s*:/)
    expect(markdown).not.toMatch(/projects\/[^/\s]+\/secrets\//)
    expect(markdown).not.toContain('captured_by_organization_id')
  })
})
