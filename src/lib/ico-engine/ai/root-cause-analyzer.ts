import 'server-only'

import { toNullableNumber, toNumber } from '../shared'

import {
  roundAiNumber,
  stableAiId,
  type AiRootCauseDimensionRow,
  type AiSignalMetricId,
  type AiSignalRecord
} from './types'

type Direction = 'lower_is_worse' | 'higher_is_worse'

const METRIC_DIRECTIONS: Record<AiSignalMetricId, Direction> = {
  otd_pct: 'lower_is_worse',
  rpa_avg: 'higher_is_worse',
  ftr_pct: 'lower_is_worse'
}

const getMetricValue = (row: AiRootCauseDimensionRow, metricName: AiSignalMetricId) => {
  if (metricName === 'rpa_avg') return toNullableNumber(row.rpa_avg)
  if (metricName === 'otd_pct') return toNullableNumber(row.otd_pct)

  return toNullableNumber(row.ftr_pct)
}

const isDeterioratingSignal = (signal: AiSignalRecord) => {
  if (signal.currentValue === null || signal.expectedValue === null) return false

  return METRIC_DIRECTIONS[signal.metricName] === 'higher_is_worse'
    ? signal.currentValue > signal.expectedValue
    : signal.currentValue < signal.expectedValue
}

const getWeight = (row: AiRootCauseDimensionRow) =>
  Math.max(1, toNumber(row.completed_tasks || row.total_tasks || row.active_tasks))

const computeImpact = (signal: AiSignalRecord, row: AiRootCauseDimensionRow) => {
  const metricValue = getMetricValue(row, signal.metricName)

  if (metricValue === null || signal.currentValue === null) {
    return 0
  }

  if (METRIC_DIRECTIONS[signal.metricName] === 'higher_is_worse') {
    return Math.max(0, metricValue - signal.currentValue) * getWeight(row)
  }

  return Math.max(0, signal.currentValue - metricValue) * getWeight(row)
}

export const analyzeAiRootCauses = ({
  anomalies,
  dimensionRows,
  generatedAt,
  modelVersion
}: {
  anomalies: AiSignalRecord[]
  dimensionRows: AiRootCauseDimensionRow[]
  generatedAt: string
  modelVersion: string
}): AiSignalRecord[] => {
  const signals: AiSignalRecord[] = []

  for (const anomaly of anomalies) {
    if (anomaly.signalType !== 'anomaly' || !isDeterioratingSignal(anomaly)) {
      continue
    }

    for (const dimension of ['member', 'project', 'phase'] as const) {
      const scopedRows = dimensionRows.filter(row => row.space_id === anomaly.spaceId && row.dimension === dimension)

      if (scopedRows.length === 0) {
        continue
      }

      const impacts = scopedRows
        .map(row => ({
          row,
          impact: computeImpact(anomaly, row),
          metricValue: getMetricValue(row, anomaly.metricName)
        }))
        .filter(entry => entry.impact > 0 && entry.metricValue !== null)
        .sort((left, right) => right.impact - left.impact)
        .slice(0, 3)

      const totalImpact = impacts.reduce((sum, entry) => sum + entry.impact, 0)

      if (totalImpact <= 0) {
        continue
      }

      for (const entry of impacts) {
        const contributionPct = (entry.impact / totalImpact) * 100

        signals.push({
          signalId: stableAiId('AIS', ['root-cause', anomaly.signalId, dimension, entry.row.dimension_id]),
          signalType: 'root_cause',
          spaceId: anomaly.spaceId,
          memberId: dimension === 'member' ? entry.row.dimension_id : null,
          projectId: dimension === 'project' ? entry.row.dimension_id : null,
          metricName: anomaly.metricName,
          periodYear: anomaly.periodYear,
          periodMonth: anomaly.periodMonth,
          severity: anomaly.severity,
          currentValue: anomaly.currentValue,
          expectedValue: anomaly.expectedValue,
          zScore: anomaly.zScore,
          predictedValue: null,
          confidence: null,
          predictionHorizon: null,
          contributionPct: roundAiNumber(contributionPct),
          dimension,
          dimensionId: entry.row.dimension_id,
          actionType: null,
          actionSummary: null,
          actionTargetId: entry.row.dimension_id,
          modelVersion,
          generatedAt,
          aiEligible: anomaly.aiEligible,
          payloadJson: {
            parentSignalId: anomaly.signalId,
            dimensionLabel: entry.row.dimension_label,
            dimensionMetricValue: roundAiNumber(entry.metricValue),
            totalImpact: roundAiNumber(totalImpact)
          }
        })
      }
    }
  }

  return signals
}

