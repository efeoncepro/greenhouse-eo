import 'server-only'

import {
  FINANCE_METRIC_REGISTRY,
  roundFinanceNumber,
  stableFinanceSignalId,
  type FinanceMetricDefinition,
  type FinanceSignalMetricId,
  type FinanceSignalRecord
} from './finance-signal-types'

// Minimum monthly observations required before running a Z-score.
const MIN_HISTORY_SIZE = 3
const MAX_HISTORY_SIZE = 6
const MIN_STDDEV = 0.0001

// ─── Snapshot contract ──────────────────────────────────────────────────────
// One row per (client, period). The detector is generic: it consumes any
// numeric metric whose key matches a FinanceSignalMetricId.

export interface FinanceMetricSnapshot {
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  periodYear: number
  periodMonth: number

  // Metric fields (all optional — missing fields are skipped)
  net_margin_pct?: number | null
  gross_margin_pct?: number | null
  total_revenue_clp?: number | null
  direct_costs_clp?: number | null
  indirect_costs_clp?: number | null
  net_margin_clp?: number | null
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

const stddev = (values: number[]) => {
  if (values.length < 2) return 0

  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length

  return Math.sqrt(variance)
}

const periodKey = (snapshot: FinanceMetricSnapshot) =>
  snapshot.periodYear * 100 + snapshot.periodMonth

const scopeKey = (snapshot: FinanceMetricSnapshot) =>
  snapshot.clientId ?? snapshot.organizationId ?? 'org-aggregate'

// ─── Detector ───────────────────────────────────────────────────────────────

export interface DetectFinanceAnomaliesInput {
  currentSnapshots: FinanceMetricSnapshot[]

  // History indexed by scopeKey (clientId or organizationId).
  historyByScope: Map<string, FinanceMetricSnapshot[]>
  generatedAt: string
  modelVersion: string
}

export const detectFinanceAnomalies = ({
  currentSnapshots,
  historyByScope,
  generatedAt,
  modelVersion
}: DetectFinanceAnomaliesInput): FinanceSignalRecord[] => {
  const signals: FinanceSignalRecord[] = []

  for (const snapshot of currentSnapshots) {
    const scope = scopeKey(snapshot)
    const currentPeriod = periodKey(snapshot)

    const history = (historyByScope.get(scope) ?? [])
      .filter(row => periodKey(row) < currentPeriod)
      .sort((left, right) => periodKey(right) - periodKey(left))
      .slice(0, MAX_HISTORY_SIZE)

    for (const definition of FINANCE_METRIC_REGISTRY) {
      const signal = evaluateMetric({
        definition,
        snapshot,
        history,
        generatedAt,
        modelVersion
      })

      if (signal) signals.push(signal)
    }
  }

  return signals
}

const evaluateMetric = ({
  definition,
  snapshot,
  history,
  generatedAt,
  modelVersion
}: {
  definition: FinanceMetricDefinition
  snapshot: FinanceMetricSnapshot
  history: FinanceMetricSnapshot[]
  generatedAt: string
  modelVersion: string
}): FinanceSignalRecord | null => {
  const currentValue = snapshot[definition.metricId as keyof FinanceMetricSnapshot]

  if (typeof currentValue !== 'number' || !Number.isFinite(currentValue)) {
    return null
  }

  const historicalValues = history
    .map(row => row[definition.metricId as keyof FinanceMetricSnapshot])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (historicalValues.length < MIN_HISTORY_SIZE) {
    return null
  }

  const expectedValue = mean(historicalValues)
  const standardDeviation = stddev(historicalValues)

  if (standardDeviation < MIN_STDDEV) {
    return null
  }

  const zScore = (currentValue - expectedValue) / standardDeviation
  const absZScore = Math.abs(zScore)

  if (absZScore < 2) {
    return null
  }

  const severity = absZScore >= 3 ? 'critical' : 'warning'

  const direction = definition.higherIsBetter
    ? currentValue < expectedValue
      ? 'deterioration'
      : 'improvement'
    : currentValue > expectedValue
      ? 'deterioration'
      : 'improvement'

  // Only surface deteriorations — improvements can be summarized elsewhere and
  // shouldn't clutter the Finance Dashboard.
  if (direction === 'improvement') {
    return null
  }

  return {
    signalId: stableFinanceSignalId([
      'anomaly',
      scopeKey(snapshot),
      definition.metricId,
      snapshot.periodYear,
      snapshot.periodMonth
    ]),
    signalType: 'anomaly',
    organizationId: snapshot.organizationId,
    clientId: snapshot.clientId,
    spaceId: snapshot.spaceId,
    metricName: definition.metricId as FinanceSignalMetricId,
    periodYear: snapshot.periodYear,
    periodMonth: snapshot.periodMonth,
    severity,
    currentValue: roundFinanceNumber(currentValue),
    expectedValue: roundFinanceNumber(expectedValue),
    zScore: roundFinanceNumber(zScore),
    predictedValue: null,
    confidence: null,
    predictionHorizon: null,
    contributionPct: null,
    dimension: null,
    dimensionId: null,
    actionType: null,
    actionSummary: null,
    actionTargetId: null,
    modelVersion,
    generatedAt,
    aiEligible: true,
    payloadJson: {
      sampleSize: historicalValues.length,
      direction,
      metricUnit: definition.unit,
      higherIsBetter: definition.higherIsBetter
    }
  }
}
