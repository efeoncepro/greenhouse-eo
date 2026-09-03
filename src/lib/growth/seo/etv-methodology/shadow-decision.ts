/**
 * TASK-1806 Slice 2 — DECISOR del shadow legacy/improved ETV (módulo PURO: sin `server-only`, sin IO).
 *
 * Toma evidencia YA proyectada (snapshots comparables por celda, benchmark GSC opcional, operabilidad
 * del ejecutor) y aplica, regla por regla, los umbrales congelados en el preregistro
 * `docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md` (§4 celdas, §5 métricas
 * y decisión). Los umbrales viven en `PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03`; cambiarlos exige
 * una versión nueva del preregistro, nunca un ajuste post-hoc.
 *
 * Lo que este módulo NO hace, a propósito:
 *   - no llama al proveedor ni a la base (la lectura vive en `shadow-report.ts`);
 *   - no promedia GSC con ETV ni legacy con improved: reusa `compareEtvSnapshots` y
 *     `compareEtvWithGscBenchmark` (TASK-1805) y decide sobre sus salidas;
 *   - no deja que Efeonce CL (celda de borde) vete ni certifique: sus celdas sólo producen hallazgos `info`.
 *
 * Cada regla del §5 es una función pequeña y nombrada (`rule*`); la decisión compone sus hallazgos con una
 * precedencia explícita: `hold` (evidencia inconclusa) > `no_go` (calibración peor en Berel) > `hold`
 * (regresión ±40 % sin explicación) > `go` (rebaseline o breakpoint).
 */

import {
  ETV_IMPROVED_METHODOLOGY,
  ETV_LEGACY_METHODOLOGY,
  type EtvHistoricalCalculationBasis,
  type EtvMethodologyVersion
} from './contracts'
import {
  compareEtvSnapshots,
  compareEtvWithGscBenchmark,
  type EtvComparableSnapshot,
  type EtvEvaluationCell,
  type EtvEvaluationMode,
  type EtvGscCalibration,
  type EtvSnapshotComparison
} from './evaluator'

// ─── Cohorte y artefacto del ejecutor (contratos de entrada) ─────────────────────────────────

export type EtvShadowCellPurpose = 'visibility' | 'prospect'

/** Celda de la cohorte congelada: la celda del evaluador + a quién se atribuye el gasto + propósito. */
export type EtvShadowCohortCell = EtvEvaluationCell & {
  /** `prospect` = la celda `ranked_keywords` limit 1000 que NO persiste (vive sólo en `summary.json`). */
  purpose?: EtvShadowCellPurpose
  organizationId: string
  /** Sólo `bulk_traffic_estimation`: los `targets` del request (se evalúa un item por target). */
  targets?: string[]
}

export type EtvShadowCohort = {
  id: string
  approvedBy: string
  approvedAt: string
  /** Sujeto normalizado → organización (atribución de gasto y, si es propia, propiedad GSC). */
  organizations: Record<string, string>
  cells: EtvShadowCohortCell[]
}

/**
 * Una request del `summary.json` que escribe el ejecutor bounded (Slice 1, `shadow-runner.ts`
 * `EtvShadowRequestRecord`). Los campos nulos existen porque una request `already_captured` o
 * `skipped_after_abort` no llegó al proveedor: no llevan hash, instante ni método efectivo.
 */
export type EtvShadowRunRequest = {
  cellIndex: number
  familySlug: string
  subject: string
  locationCode: string
  languageCode: string
  purpose?: EtvShadowCellPurpose | null
  methodology: EtvMethodologyVersion
  requested: EtvMethodologyVersion | null
  providerEffective: EtvMethodologyVersion | null
  requestedAt: string | null
  /** Hash de los inputs SIN el flag de fórmula: dos requests de la misma celda deben compartirlo. */
  taskHashWithoutFlag: string | null
  statusCode: number | null
  ok: boolean
  /** `executed` | `already_captured` | `skipped_after_abort` (vocabulario del runner). */
  status?: string
  errorCode?: string | null
  costUsd: number
  latencyMs: number | null
  persisted?: { table: string | null; rows: number; conflict: boolean | number } | null
  historicalBasis?: EtvHistoricalCalculationBasis | null
  prospectTraffic?: { sum: number | null; sampleRows: number; rowLimit: number; truncated: boolean } | null
}

export type EtvShadowRunSummary = {
  runId: string
  cohortId: string
  mode: EtvEvaluationMode
  executed: boolean
  totals: { requests: number; costUsd: number; forecastUsd: number; aborted: boolean; abortReason: string | null }
  requests: EtvShadowRunRequest[]
}

// ─── Umbrales preregistrados ─────────────────────────────────────────────────────────────────

export type EtvShadowThresholds = {
  /** Versión del preregistro del que salen los umbrales (trazabilidad, no lógica). */
  preregistration: string
  /** Sujeto de calibración (§5.1): la única celda que puede certificar o vetar. */
  calibrationSubject: string
  /** Sujetos de borde (§4): miden nulls/ceros/estabilidad; NUNCA vetan ni certifican. */
  edgeSubjects: string[]
  /** §5.1 — puntos porcentuales máximos que el error relativo de improved puede empeorar vs legacy. */
  gscRelativeErrorMaxWorseningPoints: number
  /** §5.2 — Jaccard mínimo del top-N (relevant_pages / subdomains del sujeto de calibración) para rebaseline. */
  membershipJaccardRebaselineMin: number
  /** §5.2 — cambio relativo de ETV orgánico que, sin cambio equivalente de organic.count, bloquea el go. */
  organicEtvMaxRegressionRatio: number
  /**
   * §5.2 — qué cuenta como "cambio equivalente" de organic.count: mismo signo y magnitud relativa de al
   * menos esta fracción del cambio relativo de ETV. El preregistro no lo cuantifica; este valor es la
   * lectura operativa y se declara en el artefacto.
   */
  organicCountEquivalenceMinShare: number
  /** §5.3 — meses entre los que se mide la discontinuidad de la base histórica. */
  historicalBreak: { beforeMonth: string; afterMonth: string }
  /** §5.4 — cambio de magnitud comercial del tráfico del prospecto que se lleva al copy. */
  prospectMagnitudeChangeRatio: number
  /** §5.5 — tolerancia costo real vs forecast. */
  costForecastToleranceRatio: number
  /** §5.6 — celdas inválidas por encima de las cuales la evidencia es inconclusa (`hold`). */
  invalidCellsHoldAbove: number
  /** Ventana GSC (§5.1): días y rezago de publicación del extremo nuevo. */
  gscWindowDays: number
  gscLagDays: number
}

export const PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03: EtvShadowThresholds = Object.freeze({
  preregistration: 'docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md',
  calibrationSubject: 'berel.com',
  edgeSubjects: ['efeoncepro.com'],
  gscRelativeErrorMaxWorseningPoints: 10,
  membershipJaccardRebaselineMin: 0.8,
  organicEtvMaxRegressionRatio: 0.4,
  organicCountEquivalenceMinShare: 0.5,
  historicalBreak: { beforeMonth: '2026-06', afterMonth: '2026-07' },
  prospectMagnitudeChangeRatio: 0.3,
  costForecastToleranceRatio: 0.05,
  invalidCellsHoldAbove: 2,
  gscWindowDays: 28,
  gscLagDays: 2
})

// ─── Evaluación por celda ────────────────────────────────────────────────────────────────────

export type EtvShadowGscWindow = {
  startDate: string
  endDate: string
  days: number
  /** ISO-3166-1 alpha-3 en minúscula, como lo entrega la dimensión `country` de GSC. */
  country: string
  /** Factor aplicado a los clics de la ventana para llevarlos a base mensual (30/28). */
  monthlyNormalizationFactor: number
}

export type EtvShadowGscBenchmark =
  | {
      status: 'comparable'
      siteUrl: string
      window: EtvShadowGscWindow
      /** Clics medidos en la ventana (país = mercado, todos los dispositivos). */
      windowClicks: number
      /** Clics × 30/28: la base contra la que se compara el ETV mensual. */
      monthlyClicks: number
      calibration: EtvGscCalibration
    }
  | {
      status: 'not_comparable'
      reason:
        | 'no_organization'
        | 'not_connected'
        | 'property_mismatch'
        | 'country_not_mapped'
        | 'disabled'
        | 'token_unhealthy'
        | 'query_failed'
        | 'no_etv_to_calibrate'
    }
  | { status: 'not_applicable'; reason: 'competitor' | 'endpoint_not_calibrated' }

export type EtvShadowOperability = {
  legacy: { statusCode: number | null; ok: boolean | null; latencyMs: number | null; costUsd: number | null }
  improved: { statusCode: number | null; ok: boolean | null; latencyMs: number | null; costUsd: number | null }
  /** Mismo `taskHashWithoutFlag` en ambas requests; null si el ejecutor no dejó `summary.json`. */
  inputsEquivalent: boolean | null
}

export type EtvShadowHistoricalSeries = {
  legacy: Array<{ month: string; organicEtv: number | null }>
  improved: Array<{ month: string; organicEtv: number | null; basis: EtvHistoricalCalculationBasis | null }>
}

export type EtvShadowCellValidityReason =
  | 'snapshot_missing:legacy'
  | 'snapshot_missing:improved'
  | 'no_market_data:legacy'
  | 'no_market_data:improved'
  | 'status_code_not_20000:legacy'
  | 'status_code_not_20000:improved'
  | 'inputs_not_equivalent'
  | 'temporal_canary_not_ab'

export type EtvShadowCellEvaluation = {
  cellIndex: number
  familySlug: EtvEvaluationCell['familySlug']
  purpose: EtvShadowCellPurpose
  subject: string
  locationCode: string
  languageCode: string
  period: EtvEvaluationCell['period'] | null
  /** Rol derivado de los umbrales: calibración (Berel), competidor (comex) o borde (Efeonce CL). */
  role: 'calibration' | 'competitor' | 'edge'
  validity: { valid: boolean; reasons: EtvShadowCellValidityReason[] }
  /** Comparación intra-DataForSEO (null cuando falta alguna fórmula). */
  comparison: EtvSnapshotComparison | null
  gsc: EtvShadowGscBenchmark | null
  historical: EtvShadowHistoricalSeries | null
  operability: EtvShadowOperability | null
  /** Evidencia de la fila principal por fórmula (para el artefacto, sin payloads). */
  evidence: {
    legacy: { capturedAt: string | null; methodologyEvidence: string | null }
    improved: { capturedAt: string | null; methodologyEvidence: string | null }
  }
}

/** Familias cuyo ETV de dominio se calibra contra clics GSC (§5.1). Las de membresía no tienen ETV agregado. */
export const ETV_SHADOW_GSC_CALIBRATED_FAMILIES: ReadonlyArray<EtvEvaluationCell['familySlug']> = [
  'domain_rank_overview',
  'ranked_keywords',
  'bulk_traffic_estimation'
]

/** Familias de membresía top-N (§5.2 Jaccard). */
export const ETV_SHADOW_MEMBERSHIP_FAMILIES: ReadonlyArray<EtvEvaluationCell['familySlug']> = ['relevant_pages', 'subdomains']

const normalizeSubject = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '')

export const resolveEtvShadowSubjectRole = (subject: string, thresholds: EtvShadowThresholds): EtvShadowCellEvaluation['role'] => {
  const normalized = normalizeSubject(subject)

  if (normalized === normalizeSubject(thresholds.calibrationSubject)) return 'calibration'
  if (thresholds.edgeSubjects.map(normalizeSubject).includes(normalized)) return 'edge'

  return 'competitor'
}

/** Mapa mercado DataForSEO → país GSC (alpha-3 minúscula). Sólo los mercados que la cohorte puede usar. */
export const GSC_COUNTRY_BY_DATAFORSEO_LOCATION: Readonly<Record<string, string>> = Object.freeze({
  '2484': 'mex',
  '2152': 'chl',
  '2170': 'col',
  '2604': 'per',
  '2032': 'arg',
  '2076': 'bra',
  '2840': 'usa',
  '2724': 'esp'
})

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

/**
 * Ventana GSC del preregistro: `windowDays` días terminando `lagDays` antes de la fecha de evaluación
 * (GSC no publica D-1 y consolida ~48h). La normalización mensual es un factor declarado, no un promedio.
 */
export const resolveEtvShadowGscWindow = (input: {
  evaluationDate: string
  locationCode: string
  thresholds: EtvShadowThresholds
}): EtvShadowGscWindow | null => {
  const country = GSC_COUNTRY_BY_DATAFORSEO_LOCATION[input.locationCode]

  if (!country) return null

  const endDate = addDays(input.evaluationDate, -input.thresholds.gscLagDays)
  const startDate = addDays(endDate, -(input.thresholds.gscWindowDays - 1))

  return {
    startDate,
    endDate,
    days: input.thresholds.gscWindowDays,
    country,
    monthlyNormalizationFactor: Number((30 / input.thresholds.gscWindowDays).toFixed(6))
  }
}

export const normalizeGscClicksToMonthly = (windowClicks: number, window: EtvShadowGscWindow): number =>
  Number((windowClicks * window.monthlyNormalizationFactor).toFixed(2))

export type EtvShadowCellInput = {
  cellIndex: number
  cell: EtvEvaluationCell & { purpose?: EtvShadowCellPurpose }
  mode: EtvEvaluationMode
  legacy: EtvComparableSnapshot | null
  improved: EtvComparableSnapshot | null
  /** `null` = sujeto sin dato con esa fórmula (fila-marcador o ausencia total). */
  legacyHasData?: boolean
  improvedHasData?: boolean
  legacyEvidence?: string | null
  improvedEvidence?: string | null
  /** Clics GSC ya leídos (o la razón por la que no son comparables). `undefined` = no aplica. */
  gsc?:
    | { status: 'comparable'; siteUrl: string; window: EtvShadowGscWindow; windowClicks: number }
    | Extract<EtvShadowGscBenchmark, { status: 'not_comparable' }>
    | Extract<EtvShadowGscBenchmark, { status: 'not_applicable' }>
  historical?: EtvShadowHistoricalSeries | null
  operability?: EtvShadowOperability | null
  thresholds: EtvShadowThresholds
}

/**
 * Proyecta una celda a su evaluación: validez, comparación intra-proveedor, calibración GSC (sin promediar)
 * y series históricas. No decide: sólo deja la evidencia en la forma que `decideEtvShadow` consume.
 */
export const evaluateEtvShadowCell = (input: EtvShadowCellInput): EtvShadowCellEvaluation => {
  const reasons: EtvShadowCellValidityReason[] = []

  if (input.mode !== 'exact_ab') reasons.push('temporal_canary_not_ab')
  if (!input.legacy) reasons.push('snapshot_missing:legacy')
  if (!input.improved) reasons.push('snapshot_missing:improved')
  if (input.legacy && input.legacyHasData === false) reasons.push('no_market_data:legacy')
  if (input.improved && input.improvedHasData === false) reasons.push('no_market_data:improved')

  if (input.operability) {
    if (input.operability.legacy.statusCode !== null && input.operability.legacy.statusCode !== 20000) reasons.push('status_code_not_20000:legacy')
    if (input.operability.improved.statusCode !== null && input.operability.improved.statusCode !== 20000) reasons.push('status_code_not_20000:improved')
    if (input.operability.inputsEquivalent === false) reasons.push('inputs_not_equivalent')
  }

  const comparison =
    input.legacy && input.improved ? compareEtvSnapshots({ legacy: input.legacy, improved: input.improved, mode: input.mode }) : null

  const role = resolveEtvShadowSubjectRole(input.cell.subject, input.thresholds)

  let gsc: EtvShadowGscBenchmark | null = null

  if (input.gsc) {
    if (input.gsc.status !== 'comparable') {
      gsc = input.gsc
    } else if (!ETV_SHADOW_GSC_CALIBRATED_FAMILIES.includes(input.cell.familySlug)) {
      gsc = { status: 'not_applicable', reason: 'endpoint_not_calibrated' }
    } else if (!comparison || (comparison.organicEtv.legacy === null && comparison.organicEtv.improved === null)) {
      gsc = { status: 'not_comparable', reason: 'no_etv_to_calibrate' }
    } else {
      const monthlyClicks = normalizeGscClicksToMonthly(input.gsc.windowClicks, input.gsc.window)

      gsc = {
        status: 'comparable',
        siteUrl: input.gsc.siteUrl,
        window: input.gsc.window,
        windowClicks: input.gsc.windowClicks,
        monthlyClicks,
        calibration: compareEtvWithGscBenchmark({
          gscClicks: monthlyClicks,
          legacyEtv: comparison.organicEtv.legacy,
          improvedEtv: comparison.organicEtv.improved
        })
      }
    }
  }

  return {
    cellIndex: input.cellIndex,
    familySlug: input.cell.familySlug,
    purpose: input.cell.purpose ?? 'visibility',
    subject: normalizeSubject(input.cell.subject),
    locationCode: input.cell.locationCode,
    languageCode: input.cell.languageCode,
    period: input.cell.period ?? null,
    role,
    validity: { valid: reasons.length === 0, reasons },
    comparison,
    gsc,
    historical: input.historical ?? null,
    operability: input.operability ?? null,
    evidence: {
      legacy: { capturedAt: input.legacy?.capturedAt ?? null, methodologyEvidence: input.legacyEvidence ?? null },
      improved: { capturedAt: input.improved?.capturedAt ?? null, methodologyEvidence: input.improvedEvidence ?? null }
    }
  }
}

// ─── Reglas del §5 (una función nombrada por regla) ──────────────────────────────────────────

export type EtvShadowFindingCode =
  | 'invalid_cells_exceeded'
  | 'gsc_not_comparable_in_calibration_subject'
  | 'calibration_worse_in_calibration_subject'
  | 'calibration_regression_exceeds_tolerance'
  | 'calibration_regression_within_tolerance'
  | 'calibration_improved_or_tie'
  | 'membership_shift_requires_breakpoint'
  | 'membership_not_measurable'
  | 'membership_stable'
  | 'etv_regression_without_count_change'
  | 'historical_discontinuity'
  | 'historical_discontinuity_not_measurable'
  | 'historical_continuous'
  | 'prospect_magnitude_shift'
  | 'cost_deviates_from_forecast'
  | 'edge_subject_observation'
  | 'cell_invalid'

export type EtvShadowFinding = {
  code: EtvShadowFindingCode
  severity: 'blocking' | 'warning' | 'info'
  cell?: number
  detail: string
}

export type EtvShadowDecision = {
  decision: 'go_rebaseline' | 'go_breakpoint' | 'hold' | 'no_go'
  historicalTreatment: 'rebaseline' | 'breakpoint' | null
  findings: EtvShadowFinding[]
  rationale: string[]
}

type RuleOutcome = { findings: EtvShadowFinding[]; hold?: boolean; noGo?: boolean; breakpoint?: boolean }

const pct = (value: number | null): string => (value === null ? 'n/d' : `${(value * 100).toFixed(1)} %`)

const fmt = (value: number | null): string => (value === null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: 2 }))

/** §5.5/§5.6 — celdas inválidas para calibración (status ≠ 20000, snapshot ausente, inputs no equivalentes). */
export const ruleInvalidCells = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const invalid = evaluations.filter(evaluation => !evaluation.validity.valid)

  const findings: EtvShadowFinding[] = invalid.map(evaluation => ({
    code: 'cell_invalid',
    severity: 'warning',
    cell: evaluation.cellIndex,
    detail: `Celda ${evaluation.cellIndex} (${evaluation.familySlug} · ${evaluation.subject}) inválida para calibración: ${evaluation.validity.reasons.join(', ')}. Queda como evidencia.`
  }))

  if (invalid.length > thresholds.invalidCellsHoldAbove) {
    findings.push({
      code: 'invalid_cells_exceeded',
      severity: 'blocking',
      detail: `${invalid.length} celdas inválidas > ${thresholds.invalidCellsHoldAbove}: evidencia inconclusa (§5.6 hold).`
    })

    return { findings, hold: true }
  }

  return { findings }
}

const calibrationCells = (evaluations: readonly EtvShadowCellEvaluation[]) =>
  evaluations.filter(
    evaluation =>
      evaluation.role === 'calibration' &&
      evaluation.validity.valid &&
      ETV_SHADOW_GSC_CALIBRATED_FAMILIES.includes(evaluation.familySlug)
  )

/** §5.6 — GSC no comparable en el sujeto de calibración → hold. */
export const ruleGscComparability = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const cells = calibrationCells(evaluations)
  const comparable = cells.filter(evaluation => evaluation.gsc?.status === 'comparable')

  if (comparable.length === 0) {
    const reasons = cells
      .map(evaluation => (evaluation.gsc && evaluation.gsc.status !== 'comparable' ? evaluation.gsc.reason : 'sin benchmark'))
      .join(', ')

    return {
      findings: [
        {
          code: 'gsc_not_comparable_in_calibration_subject',
          severity: 'blocking',
          detail: `Ninguna celda de ${thresholds.calibrationSubject} tiene benchmark GSC comparable (${reasons || 'sin celdas válidas'}): la calibración no puede evaluarse (§5.6 hold).`
        }
      ],
      hold: true
    }
  }

  return { findings: [] }
}

/**
 * §5.1 — Calibración en el sujeto de calibración. La foto de dominio (`domain_rank_overview`) es la celda
 * primaria: improved debe quedar más cerca o empatar. En las demás celdas calibradas del mismo sujeto, un
 * empeoramiento del error relativo mayor que la tolerancia (10 pp) también es no-go; menor, se declara.
 */
export const ruleGscCalibration = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const findings: EtvShadowFinding[] = []
  let noGo = false

  for (const evaluation of calibrationCells(evaluations)) {
    if (!evaluation.gsc || evaluation.gsc.status !== 'comparable') continue

    const { calibration, monthlyClicks } = evaluation.gsc
    const legacyRel = calibration.legacy.relativeError
    const improvedRel = calibration.improved.relativeError
    const worseningPoints = legacyRel !== null && improvedRel !== null ? Number(((improvedRel - legacyRel) * 100).toFixed(2)) : null
    const primary = evaluation.familySlug === 'domain_rank_overview'
    const base = `Celda ${evaluation.cellIndex} (${evaluation.familySlug}): GSC ${fmt(monthlyClicks)} clics/mes · legacy err.rel ${pct(legacyRel)} · improved err.rel ${pct(improvedRel)} · más cerca: ${calibration.closer ?? 'n/d'}`

    if (calibration.closer === ETV_IMPROVED_METHODOLOGY || calibration.closer === 'tie') {
      findings.push({ code: 'calibration_improved_or_tie', severity: 'info', cell: evaluation.cellIndex, detail: base })
      continue
    }

    if (calibration.closer === null) {
      findings.push({
        code: 'gsc_not_comparable_in_calibration_subject',
        severity: 'warning',
        cell: evaluation.cellIndex,
        detail: `${base} — falta ETV en una fórmula; la celda no calibra.`
      })
      continue
    }

    const exceeds = worseningPoints === null || worseningPoints > thresholds.gscRelativeErrorMaxWorseningPoints

    if (primary || exceeds) {
      noGo = true
      findings.push({
        code: primary ? 'calibration_worse_in_calibration_subject' : 'calibration_regression_exceeds_tolerance',
        severity: 'blocking',
        cell: evaluation.cellIndex,
        detail: `${base} — improved empeora la calibración en ${thresholds.calibrationSubject}${
          worseningPoints === null ? '' : ` (+${worseningPoints} pp; tolerancia ${thresholds.gscRelativeErrorMaxWorseningPoints} pp)`
        }. Sin explicación registrada → no-go (§5.6).`
      })
    } else {
      findings.push({
        code: 'calibration_regression_within_tolerance',
        severity: 'warning',
        cell: evaluation.cellIndex,
        detail: `${base} — legacy más cerca por +${worseningPoints} pp, dentro de la tolerancia de ${thresholds.gscRelativeErrorMaxWorseningPoints} pp.`
      })
    }
  }

  return { findings, noGo }
}

/** §5.2 — Jaccard del top-N en `relevant_pages`/`subdomains` del sujeto de calibración. */
export const ruleMembershipJaccard = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const findings: EtvShadowFinding[] = []
  let breakpoint = false

  const cells = evaluations.filter(
    evaluation => evaluation.role === 'calibration' && evaluation.validity.valid && ETV_SHADOW_MEMBERSHIP_FAMILIES.includes(evaluation.familySlug)
  )

  for (const evaluation of cells) {
    const membership = evaluation.comparison?.membership

    if (!membership || membership.jaccard === null) {
      breakpoint = true
      findings.push({
        code: 'membership_not_measurable',
        severity: 'warning',
        cell: evaluation.cellIndex,
        detail: `Celda ${evaluation.cellIndex} (${evaluation.familySlug}): top-N vacío en alguna fórmula; Jaccard no medible → no se puede certificar rebaseline (breakpoint por defecto).`
      })
      continue
    }

    const detail = `Celda ${evaluation.cellIndex} (${evaluation.familySlug}): Jaccard ${membership.jaccard.toFixed(3)} · entradas ${membership.entries.length} · salidas ${membership.exits.length} · cambios de rango ${membership.rankChanges.length}`

    if (membership.jaccard < thresholds.membershipJaccardRebaselineMin) {
      breakpoint = true
      findings.push({
        code: 'membership_shift_requires_breakpoint',
        severity: 'warning',
        cell: evaluation.cellIndex,
        detail: `${detail} < ${thresholds.membershipJaccardRebaselineMin} → breakpoint visible obligatorio aunque la calibración mejore (§5.2).`
      })
    } else {
      findings.push({ code: 'membership_stable', severity: 'info', cell: evaluation.cellIndex, detail: `${detail} ≥ ${thresholds.membershipJaccardRebaselineMin}.` })
    }
  }

  return { findings, breakpoint }
}

/** §5.2 — ±40 % de ETV orgánico del sujeto de calibración sin cambio equivalente de organic.count → bloquea el go. */
export const ruleOrganicEtvRegression = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const findings: EtvShadowFinding[] = []
  let hold = false

  for (const evaluation of calibrationCells(evaluations)) {
    const comparison = evaluation.comparison

    if (!comparison || comparison.organicEtv.relative === null) continue

    const etvRel = comparison.organicEtv.relative

    if (Math.abs(etvRel) <= thresholds.organicEtvMaxRegressionRatio) continue

    const countRel = comparison.organicCount.relative

    const equivalent =
      countRel !== null && Math.sign(countRel) === Math.sign(etvRel) && Math.abs(countRel) >= Math.abs(etvRel) * thresholds.organicCountEquivalenceMinShare

    if (equivalent) continue

    hold = true
    findings.push({
      code: 'etv_regression_without_count_change',
      severity: 'blocking',
      cell: evaluation.cellIndex,
      detail: `Celda ${evaluation.cellIndex} (${evaluation.familySlug}): ETV orgánico ${fmt(comparison.organicEtv.legacy)} → ${fmt(
        comparison.organicEtv.improved
      )} (${pct(etvRel)}) supera ±${pct(thresholds.organicEtvMaxRegressionRatio)} sin cambio equivalente de organic.count (${pct(countRel)}; equivalente = mismo signo y ≥ ${pct(
        thresholds.organicCountEquivalenceMinShare
      )} del cambio de ETV). Bloquea el go hasta explicación (§5.2).`
    })
  }

  return { findings, hold }
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export type EtvShadowHistoricalAssessment = {
  ratioByMonth: Array<{ month: string; legacy: number | null; improved: number | null; ratio: number | null; basis: EtvHistoricalCalculationBasis | null }>
  /** Salto relativo del ratio improved/legacy entre los dos meses del quiebre. */
  discontinuity: number | null
  /** Mediana de |legacy_m / legacy_{m-1} − 1| sobre la serie legacy. */
  legacyMedianMonthlyVariation: number | null
}

/** Combina las celdas históricas del sujeto de calibración en una sola serie mensual (por base). */
export const assessEtvShadowHistory = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): EtvShadowHistoricalAssessment | null => {
  const cells = evaluations.filter(evaluation => evaluation.role === 'calibration' && evaluation.familySlug === 'historical_rank_overview' && evaluation.historical)

  if (cells.length === 0) return null

  const legacy = new Map<string, number | null>()
  const improved = new Map<string, { etv: number | null; basis: EtvHistoricalCalculationBasis | null }>()

  for (const cell of cells) {
    for (const point of cell.historical?.legacy ?? []) legacy.set(point.month, point.organicEtv)
    for (const point of cell.historical?.improved ?? []) improved.set(point.month, { etv: point.organicEtv, basis: point.basis })
  }

  const months = [...new Set([...legacy.keys(), ...improved.keys()])].sort()

  const ratioByMonth = months.map(month => {
    const l = legacy.get(month) ?? null
    const i = improved.get(month)?.etv ?? null

    return {
      month,
      legacy: l,
      improved: i,
      ratio: l !== null && i !== null && l !== 0 ? Number((i / l).toFixed(6)) : null,
      basis: improved.get(month)?.basis ?? null
    }
  })

  const legacyMonths = months.filter(month => (legacy.get(month) ?? null) !== null)
  const variations: number[] = []

  for (let index = 1; index < legacyMonths.length; index += 1) {
    const prev = legacy.get(legacyMonths[index - 1]) as number
    const curr = legacy.get(legacyMonths[index]) as number

    if (prev !== 0) variations.push(Math.abs(curr / prev - 1))
  }

  const before = ratioByMonth.find(point => point.month === thresholds.historicalBreak.beforeMonth)?.ratio ?? null
  const after = ratioByMonth.find(point => point.month === thresholds.historicalBreak.afterMonth)?.ratio ?? null

  return {
    ratioByMonth,
    discontinuity: before !== null && after !== null && before !== 0 ? Number(Math.abs(after / before - 1).toFixed(6)) : null,
    legacyMedianMonthlyVariation: median(variations)
  }
}

/** §5.3 — discontinuidad 2026-06→2026-07 mayor que la variación mensual mediana legacy → breakpoint. */
export const ruleHistoricalDiscontinuity = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const assessment = assessEtvShadowHistory(evaluations, thresholds)

  if (!assessment) return { findings: [] }

  const { beforeMonth, afterMonth } = thresholds.historicalBreak

  if (assessment.discontinuity === null || assessment.legacyMedianMonthlyVariation === null) {
    return {
      findings: [
        {
          code: 'historical_discontinuity_not_measurable',
          severity: 'warning',
          detail: `Historia: falta el ratio improved/legacy de ${beforeMonth} o ${afterMonth}, o la serie legacy no tiene variación mensual medible; la discontinuidad no se puede declarar.`
        }
      ]
    }
  }

  const detail = `Historia: salto del ratio improved/legacy ${beforeMonth}→${afterMonth} = ${pct(assessment.discontinuity)} vs variación mensual mediana legacy ${pct(
    assessment.legacyMedianMonthlyVariation
  )}.`

  if (assessment.discontinuity > assessment.legacyMedianMonthlyVariation) {
    return { findings: [{ code: 'historical_discontinuity', severity: 'warning', detail: `${detail} Discontinuidad → breakpoint visible (§5.3).` }], breakpoint: true }
  }

  return { findings: [{ code: 'historical_continuous', severity: 'info', detail }] }
}

/** §5.4 — cambio de magnitud comercial del prospecto > ±30 % → hallazgo (va al copy del diagnóstico). */
export const ruleProspectMagnitude = (evaluations: readonly EtvShadowCellEvaluation[], thresholds: EtvShadowThresholds): RuleOutcome => {
  const findings: EtvShadowFinding[] = []

  for (const evaluation of evaluations) {
    if (evaluation.purpose !== 'prospect' || !evaluation.validity.valid) continue

    const prospect = evaluation.comparison?.prospectTraffic

    if (!prospect || prospect.relative === null) continue

    if (Math.abs(prospect.relative) > thresholds.prospectMagnitudeChangeRatio) {
      findings.push({
        code: 'prospect_magnitude_shift',
        severity: 'warning',
        cell: evaluation.cellIndex,
        detail: `Prospecto (${evaluation.subject}): suma orgánica ${fmt(prospect.legacy)} → ${fmt(prospect.improved)} (${pct(prospect.relative)}) > ±${pct(
          thresholds.prospectMagnitudeChangeRatio
        )}; truncado legacy=${prospect.legacyTruncated} improved=${prospect.improvedTruncated}. Se lleva al copy del diagnóstico, no a esta decisión (§5.4).`
      })
    }
  }

  return { findings }
}

/** §4 — el sujeto de borde sólo observa: nulls, ceros y estabilidad, con severidad `info`. */
export const ruleEdgeSubjectObservations = (evaluations: readonly EtvShadowCellEvaluation[]): RuleOutcome => {
  const findings: EtvShadowFinding[] = evaluations
    .filter(evaluation => evaluation.role === 'edge')
    .map(evaluation => {
      const comparison = evaluation.comparison
      const gsc = evaluation.gsc

      return {
        code: 'edge_subject_observation',
        severity: 'info',
        cell: evaluation.cellIndex,
        detail: `Borde ${evaluation.subject} celda ${evaluation.cellIndex} (${evaluation.familySlug}): ETV ${fmt(comparison?.organicEtv.legacy ?? null)} → ${fmt(
          comparison?.organicEtv.improved ?? null
        )}${gsc?.status === 'comparable' ? ` · GSC ${fmt(gsc.monthlyClicks)} clics/mes · más cerca: ${gsc.calibration.closer ?? 'n/d'}` : ''}${
          evaluation.validity.valid ? '' : ` · inválida (${evaluation.validity.reasons.join(', ')})`
        }. No veta ni certifica.`
      }
    })

  return { findings }
}

/** §5.5 — costo real vs forecast (±5 %). */
export const ruleCostForecast = (cost: { forecastUsd: number; realUsd: number } | undefined, thresholds: EtvShadowThresholds): RuleOutcome => {
  if (!cost || cost.forecastUsd <= 0) return { findings: [] }

  const deviation = Number((cost.realUsd / cost.forecastUsd - 1).toFixed(6))

  if (Math.abs(deviation) > thresholds.costForecastToleranceRatio) {
    return {
      findings: [
        {
          code: 'cost_deviates_from_forecast',
          severity: 'warning',
          detail: `Costo real USD ${cost.realUsd.toFixed(4)} vs forecast USD ${cost.forecastUsd.toFixed(4)} (${pct(deviation)}) fuera de ±${pct(thresholds.costForecastToleranceRatio)}.`
        }
      ]
    }
  }

  return { findings: [] }
}

// ─── Decisión ────────────────────────────────────────────────────────────────────────────────

/**
 * Aplica las reglas del preregistro §5 y compone la decisión §5.6. Precedencia: `hold` por evidencia
 * inconclusa (celdas inválidas > 2 o GSC no comparable en Berel) > `no_go` (improved empeora calibración
 * en Berel) > `hold` por regresión ±40 % sin explicación > `go` con `breakpoint` (Jaccard < 0,8,
 * membresía no medible o discontinuidad histórica) o `rebaseline`.
 */
export const decideEtvShadow = (
  evaluations: readonly EtvShadowCellEvaluation[],
  thresholds: EtvShadowThresholds = PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03,
  context: { cost?: { forecastUsd: number; realUsd: number } } = {}
): EtvShadowDecision => {
  const invalid = ruleInvalidCells(evaluations, thresholds)
  const comparability = ruleGscComparability(evaluations, thresholds)
  const calibration = ruleGscCalibration(evaluations, thresholds)
  const membership = ruleMembershipJaccard(evaluations, thresholds)
  const regression = ruleOrganicEtvRegression(evaluations, thresholds)
  const history = ruleHistoricalDiscontinuity(evaluations, thresholds)
  const prospect = ruleProspectMagnitude(evaluations, thresholds)
  const edge = ruleEdgeSubjectObservations(evaluations)
  const cost = ruleCostForecast(context.cost, thresholds)

  const findings = [
    ...invalid.findings,
    ...comparability.findings,
    ...calibration.findings,
    ...membership.findings,
    ...regression.findings,
    ...history.findings,
    ...prospect.findings,
    ...edge.findings,
    ...cost.findings
  ]

  const rationale: string[] = [
    `Umbrales: ${thresholds.preregistration} (§5). Sujeto de calibración ${thresholds.calibrationSubject}; borde ${thresholds.edgeSubjects.join(', ')} sin voto.`,
    'GSC se compara, nunca se promedia con ETV; legacy e improved se comparan, nunca se promedian entre sí.'
  ]

  if (invalid.hold || comparability.hold) {
    rationale.push('Evidencia inconclusa (§5.6): no hay cutover voluntario; safe mode al corte del proveedor.')

    return { decision: 'hold', historicalTreatment: null, findings, rationale }
  }

  if (calibration.noGo) {
    rationale.push(`Improved empeora la calibración contra GSC en ${thresholds.calibrationSubject} sin explicación (§5.6 no-go): congelar capturas ETV al corte; no existe legacy después.`)

    return { decision: 'no_go', historicalTreatment: null, findings, rationale }
  }

  if (regression.hold) {
    rationale.push('La calibración cumple, pero un cambio de ETV orgánico > ±40 % sin cambio equivalente de organic.count bloquea el go hasta explicación (§5.2).')

    return { decision: 'hold', historicalTreatment: null, findings, rationale }
  }

  if (membership.breakpoint || history.breakpoint) {
    rationale.push(
      membership.breakpoint
        ? 'Calibración cumple (§5.1) pero la membresía del top-N cambió o no es medible (§5.2): breakpoint visible.'
        : 'Calibración y membresía cumplen; la discontinuidad histórica 2026-06→2026-07 (§5.3) exige breakpoint visible.'
    )

    return { decision: 'go_breakpoint', historicalTreatment: 'breakpoint', findings, rationale }
  }

  rationale.push('Calibración cumple (§5.1), Jaccard ≥ 0,8 en el sujeto de calibración (§5.2) y sin discontinuidad histórica declarada (§5.3): rebaseline acotado.')

  return { decision: 'go_rebaseline', historicalTreatment: 'rebaseline', findings, rationale }
}

// ─── Utilidades compartidas con el reporte (puras) ───────────────────────────────────────────

/** Comprueba, desde el `summary.json`, que cada celda tenga sus dos requests con inputs equivalentes. */
export const deriveEtvShadowOperability = (requests: readonly EtvShadowRunRequest[], cellIndex: number, subject?: string): EtvShadowOperability | null => {
  const ofCell = requests.filter(request => request.cellIndex === cellIndex && (subject === undefined || normalizeSubject(request.subject) === normalizeSubject(subject)))

  if (ofCell.length === 0) return null

  const pick = (methodology: EtvMethodologyVersion) => ofCell.find(request => request.methodology === methodology) ?? null
  const legacy = pick(ETV_LEGACY_METHODOLOGY)
  const improved = pick(ETV_IMPROVED_METHODOLOGY)

  const project = (request: EtvShadowRunRequest | null) => ({
    statusCode: request?.statusCode ?? null,
    ok: request ? request.ok : null,
    latencyMs: request?.latencyMs ?? null,
    costUsd: request ? request.costUsd : null
  })

  // Sin una de las dos requests la celda no es A/B: `false`. Con las dos pero sin hash en alguna
  // (`already_captured`: la fila del día ya existía y no se llamó al proveedor) la equivalencia no se
  // puede afirmar ni negar: `null` (desconocida), que NO invalida la celda por sí sola.
  let inputsEquivalent: boolean | null = false

  if (legacy && improved) {
    if (legacy.taskHashWithoutFlag === null || improved.taskHashWithoutFlag === null) {
      inputsEquivalent = null
    } else {
      const driftFree = (request: EtvShadowRunRequest) => request.requested === null || request.providerEffective === null || request.requested === request.providerEffective

      inputsEquivalent = legacy.taskHashWithoutFlag === improved.taskHashWithoutFlag && driftFree(legacy) && driftFree(improved)
    }
  }

  return { legacy: project(legacy), improved: project(improved), inputsEquivalent }
}

export const normalizeEtvShadowSubject = normalizeSubject
