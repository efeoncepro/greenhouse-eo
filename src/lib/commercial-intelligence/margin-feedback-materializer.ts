import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import { publishMarginFeedbackBatchCompleted } from '@/lib/commercial/quotation-events'
import type { MarginFeedbackCalibrationSignals } from '@/lib/commercial/quotation-events'

import { materializeContractProfitabilityForPeriod } from './contract-profitability-materializer'
import { materializeProfitabilityForPeriod } from './profitability-materializer'

// ────────────────────────────────────────────────────────────────────────────
// TASK-482 — Margin Feedback Loop batch orchestrator.
//
// Runs both the quotation and contract profitability materializers for a
// window of periods, then reads the serving snapshots back to compute
// calibration signals (drift percentiles, severity bucket counts, worst
// pricing_model offenders). Those signals feed downstream recalibration
// without duplicating the base snapshot logic.
//
// Invoked from `commercial-cost-worker` at `POST /margin-feedback/materialize`
// on the daily Cloud Scheduler job (10 minutes after the cost-basis bundle
// materialization so attributed cost is fresh).
//
// Slice 1 (covered): batch invocation + calibration signals.
// Slice 2 (stub):    service_id grain blocked by TASK-452 — see `serviceGrainAvailable`.
// Slice 3 (covered): calibration signals exposed in the response + outbox event.
// ────────────────────────────────────────────────────────────────────────────

export interface MarginFeedbackBatchInput {

  /** Explicit period year. When omitted, defaults to `now.year`. */
  year?: number | null

  /** Explicit period month (1-12). When omitted, defaults to `now.month`. */
  month?: number | null

  /** Additional historical periods to re-materialize. Default 1 (re-runs
   *  current month + previous month so newly-invoiced income triggers a
   *  fresh drift calc on both). Bounded to [0, 12]. */
  monthsBack?: number | null
}

export interface MarginFeedbackBatchResult {
  runId: string
  periods: Array<{ year: number; month: number }>
  quotationCount: number
  contractCount: number
  calibrationSignals: MarginFeedbackCalibrationSignals
  serviceGrainAvailable: boolean
  startedAt: string
  completedAt: string
  durationMs: number
}

const toInt = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? Math.trunc(n) : null
}

const clampMonthsBack = (value: unknown): number => {
  const parsed = toInt(value)

  if (parsed === null) return 1
  
return Math.min(12, Math.max(0, parsed))
}

const currentYearMonth = (): { year: number; month: number } => {
  const now = new Date()

  
return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

const enumeratePeriods = (
  year: number,
  month: number,
  monthsBack: number
): Array<{ year: number; month: number }> => {
  const periods: Array<{ year: number; month: number }> = []

  for (let offset = 0; offset <= monthsBack; offset++) {
    const totalMonths = year * 12 + (month - 1) - offset
    const y = Math.floor(totalMonths / 12)
    const m = (totalMonths % 12) + 1

    periods.push({ year: y, month: m })
  }

  // Return in chronological order (oldest → newest) so materializers run
  // forwards and downstream events fire in a stable sequence.
  return periods.reverse()
}

const round2 = (value: number): number => Math.round(value * 100) / 100

const percentile = (sortedValues: number[], pct: number): number | null => {
  if (sortedValues.length === 0) return null
  if (sortedValues.length === 1) return sortedValues[0]

  const rank = (pct / 100) * (sortedValues.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)

  if (lower === upper) return sortedValues[lower]

  const weight = rank - lower

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

interface SnapshotDriftRow extends Record<string, unknown> {
  margin_drift_pct: string | number | null
  drift_severity: string | null
  pricing_model: string | null
  commercial_model: string | null
}

const loadQuotationDrift = async (
  periods: Array<{ year: number; month: number }>
): Promise<SnapshotDriftRow[]> => {
  if (periods.length === 0) return []

  const placeholders = periods
    .map((_, idx) => `($${idx * 2 + 1}::integer, $${idx * 2 + 2}::integer)`)
    .join(', ')

  const params: unknown[] = periods.flatMap(p => [p.year, p.month])

  return query<SnapshotDriftRow>(
    `SELECT margin_drift_pct, drift_severity, pricing_model, commercial_model
       FROM greenhouse_serving.quotation_profitability_snapshots
      WHERE (period_year, period_month) IN (${placeholders})`,
    params
  )
}

const loadContractDrift = async (
  periods: Array<{ year: number; month: number }>
): Promise<SnapshotDriftRow[]> => {
  if (periods.length === 0) return []

  const placeholders = periods
    .map((_, idx) => `($${idx * 2 + 1}::integer, $${idx * 2 + 2}::integer)`)
    .join(', ')

  const params: unknown[] = periods.flatMap(p => [p.year, p.month])

  return query<SnapshotDriftRow>(
    `SELECT margin_drift_pct, drift_severity, pricing_model, commercial_model
       FROM greenhouse_serving.contract_profitability_snapshots
      WHERE (period_year, period_month) IN (${placeholders})`,
    params
  )
}

interface DriftDistribution {
  p50Pct: number | null
  p90Pct: number | null
  maxAbsPct: number | null
  sampleSize: number
}

interface DriftBucketCounts {
  aligned: number
  warning: number
  critical: number
}

const summarizeDrift = (rows: SnapshotDriftRow[]): {
  distribution: DriftDistribution
  buckets: DriftBucketCounts
} => {
  const drifts: number[] = []
  const buckets: DriftBucketCounts = { aligned: 0, warning: 0, critical: 0 }

  for (const row of rows) {
    const drift =
      row.margin_drift_pct === null || row.margin_drift_pct === undefined
        ? null
        : Number(row.margin_drift_pct)

    if (drift !== null && Number.isFinite(drift)) {
      drifts.push(drift)
    }

    const severity = row.drift_severity

    if (severity === 'aligned' || severity === 'warning' || severity === 'critical') {
      buckets[severity] += 1
    }
  }

  const sorted = [...drifts].sort((a, b) => a - b)
  const absMax = drifts.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0)

  const distribution: DriftDistribution = {
    p50Pct: percentile(sorted, 50),
    p90Pct: percentile(sorted, 90),
    maxAbsPct: drifts.length > 0 ? round2(absMax) : null,
    sampleSize: drifts.length
  }

  return { distribution, buckets }
}

const topDriftByPricingModel = (
  rows: SnapshotDriftRow[]
): MarginFeedbackCalibrationSignals['topDriftByPricingModel'] => {
  const groups = new Map<
    string,
    { pricingModel: string | null; commercialModel: string | null; sum: number; count: number }
  >()

  for (const row of rows) {
    const drift =
      row.margin_drift_pct === null || row.margin_drift_pct === undefined
        ? null
        : Number(row.margin_drift_pct)

    if (drift === null || !Number.isFinite(drift)) continue

    const pricingModel = row.pricing_model ? String(row.pricing_model) : null
    const commercialModel = row.commercial_model ? String(row.commercial_model) : null
    const key = `${pricingModel ?? '__null__'}::${commercialModel ?? '__null__'}`

    const entry = groups.get(key)

    if (entry) {
      entry.sum += drift
      entry.count += 1
    } else {
      groups.set(key, { pricingModel, commercialModel, sum: drift, count: 1 })
    }
  }

  const rollup = Array.from(groups.values()).map(entry => ({
    pricingModel: entry.pricingModel,
    commercialModel: entry.commercialModel,
    meanDriftPct: round2(entry.sum / entry.count),
    sampleSize: entry.count
  }))

  return rollup
    .sort((a, b) => Math.abs(b.meanDriftPct) - Math.abs(a.meanDriftPct))
    .slice(0, 5)
}

const buildCalibrationSignals = async (
  periods: Array<{ year: number; month: number }>
): Promise<MarginFeedbackCalibrationSignals> => {
  const [quotationRows, contractRows] = await Promise.all([
    loadQuotationDrift(periods),
    loadContractDrift(periods)
  ])

  const quotation = summarizeDrift(quotationRows)
  const contract = summarizeDrift(contractRows)

  return {
    quotationDriftDistribution: quotation.distribution,
    quotationDriftBucketCounts: quotation.buckets,
    contractDriftDistribution: contract.distribution,
    contractDriftBucketCounts: contract.buckets,
    topDriftByPricingModel: topDriftByPricingModel(quotationRows)
  }
}

/**
 * Slice 2 stub — TASK-452 is still `to-do`. When `service_attribution`
 * materializes facts keyed by `service_id`, this function extends the
 * calibration signals with per-service drift. Today it returns `false`
 * and the batch stays at client-grain cost attribution.
 *
 * Keeping the probe here (vs. a hard-coded constant) means the day
 * TASK-452 ships, flipping to `true` is a one-line change behind a
 * feature flag if needed.
 */
const isServiceGrainAvailable = async (): Promise<boolean> => {
  try {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM information_schema.tables
          WHERE table_schema = 'greenhouse_serving'
            AND table_name = 'service_attribution'
       ) AS exists`
    )

    return rows[0]?.exists === true
  } catch {
    return false
  }
}

/**
 * Public entry point. Idempotent across re-runs — delegates to materializers
 * that already use UPSERT on (quotation_id|contract_id, period_year, period_month).
 *
 * Returns a run summary with calibration signals ready to publish, log, or
 * feed into recalibration workflows. Does NOT mutate the commercial catalog.
 */
export const runMarginFeedbackBatch = async (
  input: MarginFeedbackBatchInput = {}
): Promise<MarginFeedbackBatchResult> => {
  const runId = `mfb-${randomUUID()}`
  const startedAt = new Date()

  const { year: currentYear, month: currentMonth } = currentYearMonth()
  const year = toInt(input.year) ?? currentYear
  const month = toInt(input.month) ?? currentMonth
  const monthsBack = clampMonthsBack(input.monthsBack)

  const periods = enumeratePeriods(year, month, monthsBack)

  let quotationCount = 0
  let contractCount = 0

  for (const period of periods) {
    const [quotationResult, contractResult] = await Promise.all([
      materializeProfitabilityForPeriod({ year: period.year, month: period.month }),
      materializeContractProfitabilityForPeriod({ year: period.year, month: period.month })
    ])

    quotationCount += quotationResult.quotationCount
    contractCount += contractResult.contractCount
  }

  const [calibrationSignals, serviceGrainAvailable] = await Promise.all([
    buildCalibrationSignals(periods),
    isServiceGrainAvailable()
  ])

  await publishMarginFeedbackBatchCompleted({
    runId,
    periods,
    quotationCount,
    contractCount,
    calibrationSignals,
    serviceGrainAvailable
  })

  const completedAt = new Date()

  return {
    runId,
    periods,
    quotationCount,
    contractCount,
    calibrationSignals,
    serviceGrainAvailable,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime()
  }
}
