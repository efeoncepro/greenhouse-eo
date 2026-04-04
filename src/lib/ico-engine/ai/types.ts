import { createHash } from 'node:crypto'

import type { MetricAggregateRowLike } from '../read-metrics'

export const AI_SIGNAL_METRIC_IDS = ['otd_pct', 'rpa_avg', 'ftr_pct'] as const
export const AI_SIGNAL_TYPES = ['anomaly', 'prediction', 'root_cause', 'recommendation'] as const
export const AI_SEVERITIES = ['info', 'warning', 'critical'] as const
export const AI_DIMENSIONS = ['member', 'project', 'phase'] as const

export type AiSignalMetricId = (typeof AI_SIGNAL_METRIC_IDS)[number]
export type AiSignalType = (typeof AI_SIGNAL_TYPES)[number]
export type AiSeverity = (typeof AI_SEVERITIES)[number]
export type AiDimension = (typeof AI_DIMENSIONS)[number]

export interface AiMetricSnapshotRow extends MetricAggregateRowLike {
  space_id: string
  client_id: unknown
  period_year: unknown
  period_month: unknown
  computed_at?: unknown
  engine_version?: unknown
}

export interface AiRootCauseDimensionRow extends MetricAggregateRowLike {
  space_id: string
  dimension: AiDimension
  dimension_id: string | null
  dimension_label: string | null
}

export interface AiEligibilityResult {
  aiEligible: boolean
  completedTasks3m: number
  reason: string | null
}

export interface AiSignalRecord {
  signalId: string
  signalType: AiSignalType
  spaceId: string
  memberId: string | null
  projectId: string | null
  metricName: AiSignalMetricId
  periodYear: number
  periodMonth: number
  severity: AiSeverity | null
  currentValue: number | null
  expectedValue: number | null
  zScore: number | null
  predictedValue: number | null
  confidence: number | null
  predictionHorizon: string | null
  contributionPct: number | null
  dimension: AiDimension | null
  dimensionId: string | null
  actionType: string | null
  actionSummary: string | null
  actionTargetId: string | null
  modelVersion: string
  generatedAt: string
  aiEligible: boolean
  payloadJson: Record<string, unknown>
}

export interface AiPredictionLogRow {
  predictionId: string
  spaceId: string
  metricName: AiSignalMetricId
  periodYear: number
  periodMonth: number
  predictedValue: number
  predictedAt: string
  confidence: number
  actualValue: number | null
  actualRecordedAt: string | null
  errorPct: number | null
  modelVersion: string
}

export const stableAiId = (prefix: string, parts: Array<string | number | null | undefined>) => {
  const hash = createHash('sha1')
    .update(parts.map(part => String(part ?? '')).join('|'))
    .digest('hex')
    .slice(0, 12)

  return `EO-${prefix}-${hash}`.toUpperCase()
}

export const roundAiNumber = (value: number | null, decimals = 4) => {
  if (value === null || !Number.isFinite(value)) return null

  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

