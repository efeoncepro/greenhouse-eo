import 'server-only'

import {
  getMetricById,
  type MetricBenchmarkType,
  type MetricConfidenceLevel,
  type MetricQualityGateStatus,
  type MetricTrustSampleBasis
} from './metric-registry'
import {
  classifyRpaMetric,
  type RpaDataStatus,
  type RpaEvidenceCounts,
  type RpaSuppressionReason
} from './rpa-policy'

export interface MetricTrustEvidence {
  sampleBasis: MetricTrustSampleBasis
  sampleSize: number | null
  totalTasks: number | null
  completedTasks: number | null
  activeTasks: number | null
  deliveryClassifiedTasks: number | null
}

export interface MetricTrustMetadata {
  benchmarkType: MetricBenchmarkType
  benchmarkLabel: string
  benchmarkSource: string
  qualityGateStatus: MetricQualityGateStatus
  qualityGateReasons: string[]
  confidenceLevel: MetricConfidenceLevel
  trustEvidence: MetricTrustEvidence
  dataStatus?: RpaDataStatus
  suppressionReason?: RpaSuppressionReason | null
  evidence?: RpaEvidenceCounts
}

export interface MetricTrustRowLike {
  rpa_avg: unknown
  rpa_eligible_task_count?: unknown
  rpa_missing_task_count?: unknown
  rpa_non_positive_task_count?: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_variance: unknown
  throughput_count: unknown
  pipeline_velocity: unknown
  stuck_asset_count: unknown
  stuck_asset_pct: unknown
  total_tasks: unknown
  completed_tasks: unknown
  active_tasks: unknown
  on_time_count: unknown
  late_drop_count: unknown
  overdue_count: unknown
}

export type MetricTrustMap = Record<string, MetricTrustMetadata>

const MIN_DEGRADED_SAMPLE_SIZE = 1

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNullableNumber((value as { value?: unknown }).value)
  }

  return null
}

const buildEvidence = (sampleBasis: MetricTrustSampleBasis, row: MetricTrustRowLike): MetricTrustEvidence => {
  const totalTasks = toNullableNumber(row.total_tasks)
  const completedTasks = toNullableNumber(row.completed_tasks)
  const activeTasks = toNullableNumber(row.active_tasks)

  const deliveryClassifiedTasks = [
    toNullableNumber(row.on_time_count) ?? 0,
    toNullableNumber(row.late_drop_count) ?? 0,
    toNullableNumber(row.overdue_count) ?? 0
  ].reduce((sum, count) => sum + count, 0)

  const sampleSize = (() => {
    switch (sampleBasis) {
      case 'delivery_classified_tasks':
        return deliveryClassifiedTasks
      case 'completed_tasks':
        return completedTasks
      case 'active_tasks':
        return activeTasks
      case 'total_tasks':
        return totalTasks
      case 'rpa_policy':
        return toNullableNumber(row.rpa_eligible_task_count)
      default:
        return null
    }
  })()

  return {
    sampleBasis,
    sampleSize,
    totalTasks,
    completedTasks,
    activeTasks,
    deliveryClassifiedTasks
  }
}

const getEmptyValueReason = (sampleBasis: MetricTrustSampleBasis) => {
  switch (sampleBasis) {
    case 'delivery_classified_tasks':
      return 'no_classified_delivery_tasks'
    case 'completed_tasks':
      return 'no_completed_tasks'
    case 'active_tasks':
      return 'no_active_tasks'
    case 'total_tasks':
      return 'no_tasks_in_period'
    case 'rpa_policy':
      return 'rpa_policy_unavailable'
    default:
      return 'insufficient_input_data'
  }
}

const resolveGenericConfidence = (
  benchmarkType: MetricBenchmarkType,
  qualityGateStatus: MetricQualityGateStatus
): MetricConfidenceLevel => {
  if (qualityGateStatus === 'broken') return 'none'
  if (qualityGateStatus === 'degraded') return 'medium'

  return benchmarkType === 'external' ? 'high' : 'medium'
}

const buildGenericTrustMetadata = (metricId: string, value: number | null, row: MetricTrustRowLike): MetricTrustMetadata => {
  const metric = getMetricById(metricId)

  if (!metric) {
    throw new Error(`Unknown metric trust definition: ${metricId}`)
  }

  const benchmark = metric.benchmark ?? {
    type: 'internal' as const,
    label: 'Policy interna',
    source: 'Greenhouse operating policy'
  }

  const trustConfig = metric.trust ?? {
    sampleBasis: 'total_tasks' as const,
    healthyMinSampleSize: 10
  }

  const trustEvidence = buildEvidence(trustConfig.sampleBasis, row)
  const sampleSize = trustEvidence.sampleSize
  const qualityGateReasons: string[] = []
  let qualityGateStatus: MetricQualityGateStatus

  if (value === null || sampleSize === null || sampleSize < MIN_DEGRADED_SAMPLE_SIZE) {
    qualityGateStatus = 'broken'
    qualityGateReasons.push(getEmptyValueReason(trustConfig.sampleBasis))
  } else if (sampleSize < trustConfig.healthyMinSampleSize) {
    qualityGateStatus = 'degraded'
    qualityGateReasons.push('limited_sample_size')
  } else {
    qualityGateStatus = 'healthy'
  }

  return {
    benchmarkType: benchmark.type,
    benchmarkLabel: benchmark.label,
    benchmarkSource: benchmark.source,
    qualityGateStatus,
    qualityGateReasons,
    confidenceLevel: resolveGenericConfidence(benchmark.type, qualityGateStatus),
    trustEvidence
  }
}

const buildRpaTrustMetadata = (row: MetricTrustRowLike): MetricTrustMetadata => {
  const metric = getMetricById('rpa')

  if (!metric) {
    throw new Error('Unknown metric trust definition: rpa')
  }

  const benchmark = metric.benchmark ?? {
    type: 'adapted' as const,
    label: 'Benchmark creativo adaptado',
    source: 'Greenhouse ICO / TASK-215 runtime policy'
  }

  const trustConfig = metric.trust ?? {
    sampleBasis: 'rpa_policy' as const,
    healthyMinSampleSize: 10
  }

  const rpaPolicy = classifyRpaMetric({
    value: toNullableNumber(row.rpa_avg),
    completedTasks: toNullableNumber(row.completed_tasks),
    eligibleTaskCount: toNullableNumber(row.rpa_eligible_task_count),
    missingTaskCount: toNullableNumber(row.rpa_missing_task_count),
    nonPositiveTaskCount: toNullableNumber(row.rpa_non_positive_task_count)
  })

  const qualityGateStatus: MetricQualityGateStatus =
    rpaPolicy.dataStatus === 'valid'
      ? 'healthy'
      : rpaPolicy.dataStatus === 'low_confidence'
        ? 'degraded'
        : 'broken'

  const qualityGateReasons =
    rpaPolicy.suppressionReason
      ? [rpaPolicy.suppressionReason]
      : qualityGateStatus === 'degraded'
        ? ['limited_sample_size']
        : []

  return {
    benchmarkType: benchmark.type,
    benchmarkLabel: benchmark.label,
    benchmarkSource: benchmark.source,
    qualityGateStatus,
    qualityGateReasons,
    confidenceLevel: rpaPolicy.confidenceLevel,
    trustEvidence: {
      ...buildEvidence(trustConfig.sampleBasis, row),
      sampleSize: rpaPolicy.evidence.eligibleTasks
    },
    dataStatus: rpaPolicy.dataStatus,
    suppressionReason: rpaPolicy.suppressionReason,
    evidence: rpaPolicy.evidence
  }
}

export const buildMetricTrustMapFromRow = (row: MetricTrustRowLike): MetricTrustMap => ({
  rpa: buildRpaTrustMetadata(row),
  otd_pct: buildGenericTrustMetadata('otd_pct', toNullableNumber(row.otd_pct), row),
  ftr_pct: buildGenericTrustMetadata('ftr_pct', toNullableNumber(row.ftr_pct), row),
  cycle_time: buildGenericTrustMetadata('cycle_time', toNullableNumber(row.cycle_time_avg_days), row),
  cycle_time_variance: buildGenericTrustMetadata('cycle_time_variance', toNullableNumber(row.cycle_time_variance), row),
  throughput: buildGenericTrustMetadata('throughput', toNullableNumber(row.throughput_count), row),
  pipeline_velocity: buildGenericTrustMetadata('pipeline_velocity', toNullableNumber(row.pipeline_velocity), row),
  stuck_assets: buildGenericTrustMetadata('stuck_assets', toNullableNumber(row.stuck_asset_count), row),
  stuck_asset_pct: buildGenericTrustMetadata('stuck_asset_pct', toNullableNumber(row.stuck_asset_pct), row)
})

export const serializeMetricTrustMap = (trustMap: MetricTrustMap): string =>
  JSON.stringify(trustMap)

export const parseMetricTrustMap = (value: unknown): MetricTrustMap => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as MetricTrustMap
    } catch {
      return {}
    }
  }

  if (typeof value === 'object') {
    return value as MetricTrustMap
  }

  return {}
}
