import 'server-only'

import { buildMetricValuesFromRow } from '../read-metrics'
import { toNullableNumber, toNumber } from '../shared'

import { evaluateAiEligibility } from './eligibility'
import {
  roundAiNumber,
  stableAiId,
  type AiMetricSnapshotRow,
  type AiPredictionLogRow,
  type AiSignalMetricId,
  type AiSignalRecord
} from './types'

type SupportedPredictionMetric = {
  metricName: AiSignalMetricId
  rowMetricId: 'otd_pct' | 'rpa' | 'ftr_pct'
  direction: 'lower_is_worse' | 'higher_is_worse'
  clamp?: [number, number]
}

const SUPPORTED_PREDICTION_METRICS: SupportedPredictionMetric[] = [
  { metricName: 'otd_pct', rowMetricId: 'otd_pct', direction: 'lower_is_worse', clamp: [0, 100] },
  { metricName: 'rpa_avg', rowMetricId: 'rpa', direction: 'higher_is_worse', clamp: [0, Number.POSITIVE_INFINITY] },
  { metricName: 'ftr_pct', rowMetricId: 'ftr_pct', direction: 'lower_is_worse', clamp: [0, 100] }
]

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const getSantiagoDateParts = () => {
  const parts = DAY_FORMATTER.formatToParts(new Date())

  return {
    year: Number(parts.find(part => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find(part => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find(part => part.type === 'day')?.value ?? '1')
  }
}

const clampValue = (value: number, clamp?: [number, number]) => {
  if (!clamp) return value

  return Math.min(clamp[1], Math.max(clamp[0], value))
}

const computeSlope = (values: number[]) => {
  if (values.length < 2) return 0

  const xs = values.map((_, index) => index)
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length

  const numerator = xs.reduce((sum, x, index) => sum + ((x - meanX) * (values[index] - meanY)), 0)
  const denominator = xs.reduce((sum, x) => sum + ((x - meanX) ** 2), 0)

  if (denominator === 0) return 0

  return numerator / denominator
}

const getProgressRatio = (periodYear: number, periodMonth: number) => {
  const today = getSantiagoDateParts()

  if (today.year !== periodYear || today.month !== periodMonth) {
    return null
  }

  const totalDaysInMonth = new Date(Date.UTC(periodYear, periodMonth, 0)).getUTCDate()

  return Math.min(1, Math.max(0.05, today.day / totalDaysInMonth))
}

const getRowPeriodKey = (row: AiMetricSnapshotRow) => toNumber(row.period_year) * 100 + toNumber(row.period_month)

export const buildAiPredictions = ({
  currentSnapshots,
  historyBySpace,
  generatedAt,
  modelVersion
}: {
  currentSnapshots: AiMetricSnapshotRow[]
  historyBySpace: Map<string, AiMetricSnapshotRow[]>
  generatedAt: string
  modelVersion: string
}): {
  predictionSignals: AiSignalRecord[]
  predictionLogs: AiPredictionLogRow[]
} => {
  const predictionSignals: AiSignalRecord[] = []
  const predictionLogs: AiPredictionLogRow[] = []

  for (const snapshot of currentSnapshots) {
    const periodYear = toNumber(snapshot.period_year)
    const periodMonth = toNumber(snapshot.period_month)
    const progressRatio = getProgressRatio(periodYear, periodMonth)

    if (progressRatio === null) {
      continue
    }

    const historyRows = (historyBySpace.get(snapshot.space_id) ?? [])
      .filter(row => getRowPeriodKey(row) < getRowPeriodKey(snapshot))
      .sort((left, right) => getRowPeriodKey(left) - getRowPeriodKey(right))
      .slice(-6)

    const eligibility = evaluateAiEligibility([snapshot, ...historyRows])

    if (!eligibility.aiEligible) {
      continue
    }

    const currentMetrics = buildMetricValuesFromRow(snapshot)

    for (const definition of SUPPORTED_PREDICTION_METRICS) {
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

      if (historicalValues.length < 6) {
        continue
      }

      const slope = computeSlope(historicalValues)
      const predictedValue = clampValue(currentMetric.value + (slope * (1 - progressRatio)), definition.clamp)
      let confidence = Math.min(0.95, 0.5 + (historicalValues.length / 24) + (progressRatio * 0.3))

      if (currentMetric.qualityGateStatus === 'degraded') {
        confidence -= 0.15
      }

      if (currentMetric.dataStatus === 'low_confidence') {
        confidence -= 0.1
      }

      confidence = Math.max(0.1, confidence)

      const predictionId = stableAiId('AIP', [snapshot.space_id, definition.metricName, periodYear, periodMonth, generatedAt.slice(0, 10)])

      predictionSignals.push({
        signalId: stableAiId('AIS', ['prediction', snapshot.space_id, definition.metricName, periodYear, periodMonth]),
        signalType: 'prediction',
        spaceId: snapshot.space_id,
        memberId: null,
        projectId: null,
        metricName: definition.metricName,
        periodYear,
        periodMonth,
        severity:
          definition.direction === 'higher_is_worse'
            ? predictedValue > currentMetric.value ? 'warning' : 'info'
            : predictedValue < currentMetric.value ? 'warning' : 'info',
        currentValue: roundAiNumber(currentMetric.value),
        expectedValue: null,
        zScore: null,
        predictedValue: roundAiNumber(predictedValue),
        confidence: roundAiNumber(confidence),
        predictionHorizon: 'end_of_month',
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
          progressRatio: roundAiNumber(progressRatio),
          slope: roundAiNumber(slope),
          sampleSize: historicalValues.length,
          qualityGateStatus: currentMetric.qualityGateStatus ?? 'healthy',
          confidenceLevel: currentMetric.confidenceLevel ?? 'none'
        }
      })

      predictionLogs.push({
        predictionId,
        spaceId: snapshot.space_id,
        metricName: definition.metricName,
        periodYear,
        periodMonth,
        predictedValue: roundAiNumber(predictedValue) ?? predictedValue,
        predictedAt: generatedAt,
        confidence: roundAiNumber(confidence) ?? confidence,
        actualValue: null,
        actualRecordedAt: null,
        errorPct: null,
        modelVersion
      })
    }
  }

  return { predictionSignals, predictionLogs }
}
