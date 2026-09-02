/**
 * TASK-1805 — Evaluador INTERNO y SEGURO de la transición ETV (módulo puro: cero llamadas).
 *
 * Entrega lo que TASK-1806 necesita para decidir SIN reabrir la foundation: planificar una
 * comparación legacy/improved por celda, pronosticar su costo, ejecutar un dry-run que declara
 * `providerCalls: 0`, y comparar dos snapshots ya proyectados (valor, orden, MEMBRESÍA del top-N,
 * traffic cost, tráfico del prospecto) y cada uno contra el benchmark first-party de GSC.
 *
 * Lo que este módulo NO hace, a propósito:
 *   - no llama al proveedor ni escribe en la base (la ejecución pagada es de TASK-1806, con su
 *     propio gate, allowlist, tope USD y aprobación humana);
 *   - no promedia GSC con ETV ni legacy con improved: compara, y devuelve las dos series;
 *   - no describe una comparación temporal como A/B exacto: el modo es una DECLARACIÓN del caller
 *     y viaja tal cual en el output.
 *
 * Gate del evaluador (default OFF, dual-runtime, ledger): `GROWTH_SEO_ETV_EVALUATOR_ENABLED`, con
 * allowlist de sujetos, máximo de requests y tope USD. Sin los cuatro, `dryRun` dice `wouldExecute:
 * false` y por qué — es la única salida posible de esta task.
 */

import {
  ETV_IMPROVED_METHODOLOGY,
  ETV_LEGACY_METHODOLOGY,
  ETV_METHODOLOGY_VERSIONS,
  EtvMethodologyPolicyError,
  type EtvHistoricalCalculationBasis,
  type EtvMethodologyVersion
} from './contracts'
import { listEtvLabsFamilies, resolveEtvLabsFamilyBySlug, type EtvLabsFamilySlug } from './families'
import { buildEtvMethodologyRequest, resolveEtvHistoricalCalculationBasis, type EtvMethodologyRequest } from './policy'

// ─── Gate / configuración ───────────────────────────────────────────────────────────────────

/** Flag del evaluador. Default OFF. Dual-runtime (la ejecución pagada puede correr en cualquiera). */
export const GROWTH_SEO_ETV_EVALUATOR_FLAG = 'GROWTH_SEO_ETV_EVALUATOR_ENABLED'
export const GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST_KNOB = 'GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST'
export const GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS_KNOB = 'GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS'
export const GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD_KNOB = 'GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD'

export type EtvEvaluatorConfig = {
  enabled: boolean
  /** Dominios normalizados autorizados. Vacío = nada autorizado (fail-closed). */
  subjectAllowlist: string[]
  /** Máximo de requests pagadas de una corrida. 0 = ninguna. */
  maxRequests: number
  /** Tope USD de una corrida. 0 = ninguno. */
  budgetUsd: number
}

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

const toNonNegative = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export const resolveEtvEvaluatorConfig = (env: NodeJS.ProcessEnv = process.env): EtvEvaluatorConfig => ({
  enabled: isTrue(env[GROWTH_SEO_ETV_EVALUATOR_FLAG]),
  subjectAllowlist: (env[GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST_KNOB] ?? '')
    .split(',')
    .map(value => value.trim().toLowerCase().replace(/^www\./, ''))
    .filter(Boolean),
  maxRequests: Math.floor(toNonNegative(env[GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS_KNOB], 0)),
  budgetUsd: toNonNegative(env[GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD_KNOB], 0)
})

// ─── Celdas y plan ──────────────────────────────────────────────────────────────────────────

/** Precios Labs (USD) — espejo de `provider-pricing.ts`, declarado acá para que el módulo siga puro. */
export const ETV_EVALUATOR_PRICING = {
  taskSetupUsd: 0.012,
  resultRowUsd: 0.00012,
  historicalTaskSetupUsd: 0.12,
  historicalResultRowUsd: 0.0012
} as const

/** Unidad mínima comparable: sujeto × mercado × endpoint × período. El método NO es parte de la celda. */
export type EtvEvaluationCell = {
  subject: string
  locationCode: string
  languageCode: string
  familySlug: Extract<
    EtvLabsFamilySlug,
    'domain_rank_overview' | 'historical_rank_overview' | 'bulk_traffic_estimation' | 'ranked_keywords' | 'relevant_pages' | 'subdomains'
  >
  /** Filas esperadas (cota de costo); 1 para la foto de dominio. */
  rowLimit?: number
  /** Sólo `historical_rank_overview`: meses `YYYY-MM` inclusive. */
  period?: { fromMonth: string; toMonth: string }
}

export type EtvEvaluationMode =
  /** Dos requests con inputs equivalentes, una por fórmula, en la misma ventana. */
  | 'exact_ab'
  /** Una captura ordinaria sustituida por improved; NO produce legacy simultáneo. */
  | 'temporal_canary'

export type EtvPlannedRequest = {
  cell: EtvEvaluationCell
  methodology: EtvMethodologyVersion
  request: EtvMethodologyRequest | null
  blockedReason: 'legacy_requested_after_cutoff' | 'subject_not_allowlisted' | 'unsupported_etv_methodology' | null
  estimatedCostUsd: number
  historicalBasis: EtvHistoricalCalculationBasis | null
}

export type EtvEvaluationPlan = {
  mode: EtvEvaluationMode
  cells: number
  plannedRequests: EtvPlannedRequest[]
  requestCount: number
  blockedCount: number
  forecastUsd: number
  /** El plan es papel: cero llamadas por construcción. */
  providerCalls: 0
  caps: { maxRequests: number; budgetUsd: number; exceedsRequests: boolean; exceedsBudget: boolean }
  note: string
}

const normalizeSubject = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '')

const monthsBetween = (fromMonth: string, toMonth: string): number => {
  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)

  return Math.max(0, (ty - fy) * 12 + (tm - fm) + 1)
}

export const estimateEtvCellCostUsd = (cell: EtvEvaluationCell): number => {
  const rows = Math.max(1, cell.rowLimit ?? (cell.familySlug === 'domain_rank_overview' ? 1 : 100))

  if (cell.familySlug === 'historical_rank_overview') {
    const months = cell.period ? monthsBetween(cell.period.fromMonth, cell.period.toMonth) : 1

    return Number((ETV_EVALUATOR_PRICING.historicalTaskSetupUsd + months * ETV_EVALUATOR_PRICING.historicalResultRowUsd).toFixed(6))
  }

  return Number((ETV_EVALUATOR_PRICING.taskSetupUsd + rows * ETV_EVALUATOR_PRICING.resultRowUsd).toFixed(6))
}

/**
 * Planifica la comparación. Un `exact_ab` crea DOS requests por celda (una por fórmula); un
 * `temporal_canary` sólo la improved. Nunca ejecuta: devuelve `providerCalls: 0` por tipo.
 */
export const planEtvEvaluation = (input: {
  cells: readonly EtvEvaluationCell[]
  mode: EtvEvaluationMode
  config: EtvEvaluatorConfig
  env?: NodeJS.ProcessEnv
  now?: Date
}): EtvEvaluationPlan => {
  const now = input.now ?? new Date()
  const methodologies: EtvMethodologyVersion[] = input.mode === 'exact_ab' ? [...ETV_METHODOLOGY_VERSIONS] : [ETV_IMPROVED_METHODOLOGY]
  const plannedRequests: EtvPlannedRequest[] = []

  for (const cell of input.cells) {
    const family = resolveEtvLabsFamilyBySlug(cell.familySlug)
    const allowlisted = input.config.subjectAllowlist.includes(normalizeSubject(cell.subject))

    for (const methodology of methodologies) {
      let request: EtvMethodologyRequest | null = null
      let blockedReason: EtvPlannedRequest['blockedReason'] = allowlisted ? null : 'subject_not_allowlisted'

      try {
        request = buildEtvMethodologyRequest({ endpoint: family.googleEndpoint, env: input.env, now, methodologyOverride: methodology })
      } catch (error) {
        if (error instanceof EtvMethodologyPolicyError) {
          blockedReason =
            error.code === 'legacy_requested_after_cutoff'
              ? 'legacy_requested_after_cutoff'
              : error.code === 'unsupported_etv_methodology'
                ? 'unsupported_etv_methodology'
                : blockedReason
        } else {
          throw error
        }
      }

      plannedRequests.push({
        cell,
        methodology,
        request,
        blockedReason,
        estimatedCostUsd: blockedReason ? 0 : estimateEtvCellCostUsd(cell),
        historicalBasis:
          cell.familySlug === 'historical_rank_overview' && cell.period
            ? resolveEtvHistoricalCalculationBasis(methodology, cell.period.fromMonth)
            : null
      })
    }
  }

  const executable = plannedRequests.filter(planned => planned.blockedReason === null)
  const forecastUsd = Number(executable.reduce((sum, planned) => sum + planned.estimatedCostUsd, 0).toFixed(6))

  return {
    mode: input.mode,
    cells: input.cells.length,
    plannedRequests,
    requestCount: executable.length,
    blockedCount: plannedRequests.length - executable.length,
    forecastUsd,
    providerCalls: 0,
    caps: {
      maxRequests: input.config.maxRequests,
      budgetUsd: input.config.budgetUsd,
      exceedsRequests: executable.length > input.config.maxRequests,
      exceedsBudget: forecastUsd > input.config.budgetUsd
    },
    note:
      input.mode === 'exact_ab'
        ? 'A/B exacto: dos requests normales por celda, una por fórmula, en la misma ventana. Improved no tiene premium; el A/B duplica llamadas.'
        : 'Canary temporal: sustituye una captura ordinaria por improved. NO produce legacy simultáneo y la comparación queda confundida por tiempo — nunca describirla como paridad.'
  }
}

export type EtvEvaluationDryRun = {
  providerCalls: 0
  wouldExecute: boolean
  reasons: string[]
  plan: EtvEvaluationPlan
}

/** Dry-run fail-closed: ejecutar exige gate ON, allowlist, caps y cero celdas bloqueadas. */
export const dryRunEtvEvaluation = (plan: EtvEvaluationPlan, config: EtvEvaluatorConfig): EtvEvaluationDryRun => {
  const reasons: string[] = []

  if (!config.enabled) reasons.push(`${GROWTH_SEO_ETV_EVALUATOR_FLAG} está OFF`)
  if (config.subjectAllowlist.length === 0) reasons.push('allowlist de sujetos vacía')
  if (plan.requestCount === 0) reasons.push('ninguna request ejecutable')
  if (plan.blockedCount > 0) reasons.push(`${plan.blockedCount} request(s) bloqueada(s) por policy/allowlist`)
  if (plan.caps.exceedsRequests) reasons.push(`requests ${plan.requestCount} > máximo ${plan.caps.maxRequests}`)
  if (plan.caps.exceedsBudget) reasons.push(`forecast USD ${plan.forecastUsd} > tope USD ${plan.caps.budgetUsd}`)

  return { providerCalls: 0, wouldExecute: reasons.length === 0, reasons, plan }
}

// ─── Comparación de snapshots (evidencia YA persistida o fixtures proyectados) ──────────────

export type EtvComparableTopItem = { subject: string; etv: number | null }

export type EtvComparableSnapshot = {
  methodology: EtvMethodologyVersion
  capturedAt: string
  organicEtv: number | null
  paidEtv: number | null
  organicEstimatedTrafficCostUsd: number | null
  organicCount: number | null
  /** Top-N ordenado como lo devolvió/proyectó el productor (páginas, subdominios o keywords). */
  topItems: EtvComparableTopItem[]
  /** Sólo prospecto: suma de la muestra orgánica + cobertura. */
  prospectTraffic?: { sum: number | null; sampleRows: number; rowLimit: number; truncated: boolean }
  historicalBasis?: EtvHistoricalCalculationBasis | null
}

export type EtvMetricDelta = { legacy: number | null; improved: number | null; absolute: number | null; relative: number | null }

const delta = (legacy: number | null, improved: number | null): EtvMetricDelta => {
  if (legacy === null || improved === null) return { legacy, improved, absolute: null, relative: null }

  const absolute = Number((improved - legacy).toFixed(4))

  return { legacy, improved, absolute, relative: legacy === 0 ? null : Number((absolute / legacy).toFixed(6)) }
}

export type EtvMembershipDiff = {
  jaccard: number | null
  entries: string[]
  exits: string[]
  shared: number
  rankChanges: Array<{ subject: string; legacyRank: number; improvedRank: number }>
}

export const diffEtvMembership = (legacy: readonly EtvComparableTopItem[], improved: readonly EtvComparableTopItem[]): EtvMembershipDiff => {
  const legacySet = new Map(legacy.map((item, index) => [item.subject, index + 1]))
  const improvedSet = new Map(improved.map((item, index) => [item.subject, index + 1]))
  const union = new Set([...legacySet.keys(), ...improvedSet.keys()])
  const shared = [...legacySet.keys()].filter(subject => improvedSet.has(subject))

  return {
    jaccard: union.size === 0 ? null : Number((shared.length / union.size).toFixed(6)),
    entries: [...improvedSet.keys()].filter(subject => !legacySet.has(subject)),
    exits: [...legacySet.keys()].filter(subject => !improvedSet.has(subject)),
    shared: shared.length,
    rankChanges: shared
      .map(subject => ({ subject, legacyRank: legacySet.get(subject) as number, improvedRank: improvedSet.get(subject) as number }))
      .filter(change => change.legacyRank !== change.improvedRank)
  }
}

export type EtvSnapshotComparison = {
  mode: EtvEvaluationMode
  comparability: 'simultaneous' | 'temporal'
  organicEtv: EtvMetricDelta
  paidEtv: EtvMetricDelta
  organicEstimatedTrafficCostUsd: EtvMetricDelta
  organicCount: EtvMetricDelta
  membership: EtvMembershipDiff
  prospectTraffic: (EtvMetricDelta & { legacyTruncated: boolean; improvedTruncated: boolean }) | null
  historicalBasis: { legacy: EtvHistoricalCalculationBasis | null; improved: EtvHistoricalCalculationBasis | null }
}

/**
 * Compara dos snapshots del MISMO sujeto/mercado/endpoint. Lanza si los métodos no son los
 * esperados: comparar legacy con legacy es un error de input, no un resultado.
 */
export const compareEtvSnapshots = (input: {
  legacy: EtvComparableSnapshot
  improved: EtvComparableSnapshot
  mode: EtvEvaluationMode
}): EtvSnapshotComparison => {
  if (input.legacy.methodology !== ETV_LEGACY_METHODOLOGY || input.improved.methodology !== ETV_IMPROVED_METHODOLOGY) {
    throw new EtvMethodologyPolicyError('mixed_etv_methodology', 'compareEtvSnapshots exige un snapshot legacy y uno improved.', {
      legacy: input.legacy.methodology,
      improved: input.improved.methodology
    })
  }

  return {
    mode: input.mode,
    comparability: input.mode === 'exact_ab' ? 'simultaneous' : 'temporal',
    organicEtv: delta(input.legacy.organicEtv, input.improved.organicEtv),
    paidEtv: delta(input.legacy.paidEtv, input.improved.paidEtv),
    organicEstimatedTrafficCostUsd: delta(input.legacy.organicEstimatedTrafficCostUsd, input.improved.organicEstimatedTrafficCostUsd),
    organicCount: delta(input.legacy.organicCount, input.improved.organicCount),
    membership: diffEtvMembership(input.legacy.topItems, input.improved.topItems),
    prospectTraffic:
      input.legacy.prospectTraffic && input.improved.prospectTraffic
        ? {
            ...delta(input.legacy.prospectTraffic.sum, input.improved.prospectTraffic.sum),
            legacyTruncated: input.legacy.prospectTraffic.truncated,
            improvedTruncated: input.improved.prospectTraffic.truncated
          }
        : null,
    historicalBasis: { legacy: input.legacy.historicalBasis ?? null, improved: input.improved.historicalBasis ?? null }
  }
}

// ─── Benchmark GSC (first-party) — se compara, NUNCA se promedia ────────────────────────────

export type EtvGscBenchmark = {
  /** Clics medidos en la MISMA propiedad/país/dispositivo/ventana. */
  gscClicks: number
  legacyEtv: number | null
  improvedEtv: number | null
}

export type EtvGscCalibration = {
  legacy: { absoluteError: number | null; relativeError: number | null; direction: 'over' | 'under' | 'exact' | null }
  improved: { absoluteError: number | null; relativeError: number | null; direction: 'over' | 'under' | 'exact' | null }
  /** Qué fórmula queda más cerca de lo medido en ESTA celda; null si falta alguna. */
  closer: EtvMethodologyVersion | 'tie' | null
}

const calibrate = (etv: number | null, gscClicks: number) => {
  if (etv === null) return { absoluteError: null, relativeError: null, direction: null }

  const absoluteError = Number((etv - gscClicks).toFixed(4))

  return {
    absoluteError,
    relativeError: gscClicks === 0 ? null : Number((Math.abs(absoluteError) / gscClicks).toFixed(6)),
    direction: absoluteError > 0 ? ('over' as const) : absoluteError < 0 ? ('under' as const) : ('exact' as const)
  }
}

export const compareEtvWithGscBenchmark = (benchmark: EtvGscBenchmark): EtvGscCalibration => {
  const legacy = calibrate(benchmark.legacyEtv, benchmark.gscClicks)
  const improved = calibrate(benchmark.improvedEtv, benchmark.gscClicks)

  let closer: EtvGscCalibration['closer'] = null

  if (legacy.absoluteError !== null && improved.absoluteError !== null) {
    const l = Math.abs(legacy.absoluteError)
    const i = Math.abs(improved.absoluteError)

    closer = l === i ? 'tie' : l < i ? ETV_LEGACY_METHODOLOGY : ETV_IMPROVED_METHODOLOGY
  }

  return { legacy, improved, closer }
}

/** Resumen de la matriz para el dry-run: lo que TASK-1806 congela antes de gastar. */
export const describeEtvEvaluationMatrix = () => ({
  consumedFamilies: listEtvLabsFamilies('etv_consumed').map(family => family.slug),
  ignoredCallers: listEtvLabsFamilies('etv_ignored').map(family => family.slug),
  notEnabled: listEtvLabsFamilies('provider_supported_not_enabled').map(family => ({ slug: family.slug, ownerTask: family.ownerTask }))
})
