import 'server-only'

import { buildMetricValuesFromRow } from '../read-metrics'
import { toNullableNumber, toNumber } from '../shared'

import { evaluateAiEligibility } from './eligibility'
import {
  roundAiNumber,
  stableAiId,
  type AiMetricSnapshotRow,
  type AiSignalMetricId,
  type AiSignalRecord
} from './types'

type SupportedMetricDefinition = {
  metricName: AiSignalMetricId
  rowMetricId: 'otd_pct' | 'rpa' | 'ftr_pct'
  direction: 'lower_is_worse' | 'higher_is_worse'
}

const SUPPORTED_METRICS: SupportedMetricDefinition[] = [
  { metricName: 'otd_pct', rowMetricId: 'otd_pct', direction: 'lower_is_worse' },
  { metricName: 'rpa_avg', rowMetricId: 'rpa', direction: 'higher_is_worse' },
  { metricName: 'ftr_pct', rowMetricId: 'ftr_pct', direction: 'lower_is_worse' }
]

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

const stddev = (values: number[]) => {
  if (values.length < 2) return 0

  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length

  return Math.sqrt(variance)
}

const getRowPeriodKey = (row: AiMetricSnapshotRow) => toNumber(row.period_year) * 100 + toNumber(row.period_month)

export const detectAiAnomalies = ({
  currentSnapshots,
  historyBySpace,
  generatedAt,
  modelVersion
}: {
  currentSnapshots: AiMetricSnapshotRow[]
  historyBySpace: Map<string, AiMetricSnapshotRow[]>
  generatedAt: string
  modelVersion: string
}): AiSignalRecord[] => {
  const signals: AiSignalRecord[] = []

  for (const snapshot of currentSnapshots) {
    const periodYear = toNumber(snapshot.period_year)
    const periodMonth = toNumber(snapshot.period_month)

    const historyRows = (historyBySpace.get(snapshot.space_id) ?? [])
      .filter(row => getRowPeriodKey(row) < getRowPeriodKey(snapshot))
      .sort((left, right) => getRowPeriodKey(right) - getRowPeriodKey(left))
      .slice(0, 6)

    const eligibility = evaluateAiEligibility([snapshot, ...historyRows])

    if (!eligibility.aiEligible) {
      continue
    }

    const currentMetrics = buildMetricValuesFromRow(snapshot)

    for (const definition of SUPPORTED_METRICS) {
      const currentMetric = currentMetrics.find(metric => metric.metricId === definition.rowMetricId)

      if (!currentMetric || currentMetric.value === null) {
        continue
      }

      if (currentMetric.qualityGateStatus === 'broken' || currentMetric.dataStatus === 'suppressed' || currentMetric.dataStatus === 'unavailable') {
        continue
      }

      const historicalValues = historyRows
        .map(row => toNullableNumber((row as unknown as Record<string, unknown>)[definition.metricName]))
        .filter((value): value is number => value !== null)
        .slice(0, 6)

      if (historicalValues.length < 3) {
        continue
      }

      const expectedValue = mean(historicalValues)
      const standardDeviation = stddev(historicalValues)

      if (standardDeviation < 0.0001) {
        continue
      }

      const zScore = (currentMetric.value - expectedValue) / standardDeviation
      const absZScore = Math.abs(zScore)

      if (absZScore < 2) {
        continue
      }

      const severity = absZScore >= 3 ? 'critical' : 'warning'

      const direction =
        definition.direction === 'higher_is_worse'
          ? (currentMetric.value >= expectedValue ? 'deterioration' : 'improvement')
          : (currentMetric.value <= expectedValue ? 'deterioration' : 'improvement')

      signals.push({
        signalId: stableAiId('AIS', ['anomaly', snapshot.space_id, definition.metricName, periodYear, periodMonth]),
        signalType: 'anomaly',
        spaceId: snapshot.space_id,
        memberId: null,
        projectId: null,
        metricName: definition.metricName,
        periodYear,
        periodMonth,
        severity,
        currentValue: roundAiNumber(currentMetric.value),
        expectedValue: roundAiNumber(expectedValue),
        zScore: roundAiNumber(zScore),
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
          completedTasks3m: eligibility.completedTasks3m,
          qualityGateStatus: currentMetric.qualityGateStatus ?? 'healthy',
          confidenceLevel: currentMetric.confidenceLevel ?? 'none',
          direction
        }
      })
    }
  }

  return signals
}
