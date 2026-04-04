import 'server-only'

import {
  runIcoEngineQuery,
  getIcoEngineProjectId,
  toNumber,
  toNullableNumber,
  normalizeString,
  toTimestampString,
  buildMetricSelectSQL,
  buildPeriodFilterSQL,
  CANONICAL_ACTIVE_CSC_TASK_SQL,
  ICO_DIMENSIONS,
  type IcoDimensionKey
} from './shared'
import { ICO_DATASET, ENGINE_VERSION } from './schema'
import {
  classifyRpaMetric,
  type RpaConfidenceLevel,
  type RpaDataStatus,
  type RpaEvidenceCounts,
  type RpaSuppressionReason
} from './rpa-policy'
import {
  ICO_METRIC_REGISTRY,
  type MetricBenchmarkType,
  type MetricQualityGateStatus,
  getThresholdZone,
  CSC_PHASE_LABELS,
  type CscPhase,
  type ThresholdZone
} from './metric-registry'
import {
  buildMetricTrustMapFromRow,
  type MetricTrustEvidence,
  type MetricTrustMap,
  type MetricTrustRowLike
} from './metric-trust-policy'

// ─── Row Types (match BigQuery columns) ─────────────────────────────────────

interface SnapshotRow {
  snapshot_id: string
  space_id: string
  client_id: unknown
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
  cycle_time_variance: unknown
  throughput_count: unknown
  pipeline_velocity: unknown
  stuck_asset_count: unknown
  stuck_asset_pct: unknown
  csc_distribution: unknown
  total_tasks: unknown
  completed_tasks: unknown
  active_tasks: unknown
  on_time_count: unknown
  late_drop_count: unknown
  overdue_count: unknown
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
  computed_at: unknown
  engine_version: unknown
  client_name?: unknown
}

interface LiveMetricRow {
  space_id: string
  rpa_avg: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
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
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
}

interface CscDistributionRow {
  space_id: string
  fase_csc: string
  task_count: unknown
}

// ─── Normalized Response Types ──────────────────────────────────────────────

export interface MetricValue {
  metricId: string
  value: number | null
  zone: ThresholdZone | null
  benchmarkType?: MetricBenchmarkType
  benchmarkLabel?: string
  benchmarkSource?: string
  qualityGateStatus?: MetricQualityGateStatus
  qualityGateReasons?: string[]
  dataStatus?: RpaDataStatus
  confidenceLevel?: RpaConfidenceLevel
  suppressionReason?: RpaSuppressionReason | null
  evidence?: RpaEvidenceCounts
  trustEvidence?: MetricTrustEvidence
}

export interface CscDistributionEntry {
  phase: CscPhase
  label: string
  count: number
  pct: number
}

export interface SpaceMetricSnapshot {
  spaceId: string
  clientId: string | null
  clientName: string | null
  periodYear: number
  periodMonth: number
  metrics: MetricValue[]
  cscDistribution: CscDistributionEntry[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
    onTimeTasks: number
    lateDropTasks: number
    overdueTasks: number
    carryOverTasks: number
    overdueCarriedForwardTasks: number
  }
  computedAt: string | null
  engineVersion: string
  source: 'materialized' | 'live'
}

/**
 * Generic ICO metric snapshot — same metrics, any dimension.
 * Returned by `computeMetricsByContext()`.
 */
export interface IcoMetricSnapshot {
  dimension: IcoDimensionKey
  dimensionValue: string
  dimensionLabel: string | null
  periodYear: number
  periodMonth: number
  metrics: MetricValue[]
  cscDistribution: CscDistributionEntry[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
    onTimeTasks: number
    lateDropTasks: number
    overdueTasks: number
    carryOverTasks: number
    overdueCarriedForwardTasks: number
  }
  computedAt: string | null
  engineVersion: string
  source: 'materialized' | 'live'
}

// ─── Normalizers ────────────────────────────────────────────────────────────

export interface MetricAggregateRowLike extends MetricTrustRowLike {
  rpa_avg: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
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

const metricValueFromRow = (
  metricId: string,
  rawValue: unknown,
  trustMap: MetricTrustMap
): MetricValue => {
  const value = toNullableNumber(rawValue)
  const metric = ICO_METRIC_REGISTRY.find(m => m.id === metricId)
  const trust = trustMap[metricId]

  const normalizedValue =
    metricId === 'rpa'
      ? classifyRpaMetric({
          value,
          completedTasks: trust?.trustEvidence.completedTasks,
          eligibleTaskCount: trust?.evidence?.eligibleTasks,
          missingTaskCount: trust?.evidence?.missingTasks,
          nonPositiveTaskCount: trust?.evidence?.nonPositiveTasks
        }).value
      : value

  const zone = metric && normalizedValue !== null ? getThresholdZone(metric, normalizedValue) : null

  return {
    metricId,
    value: normalizedValue,
    zone,
    benchmarkType: trust?.benchmarkType,
    benchmarkLabel: trust?.benchmarkLabel,
    benchmarkSource: trust?.benchmarkSource,
    qualityGateStatus: trust?.qualityGateStatus,
    qualityGateReasons: trust?.qualityGateReasons,
    dataStatus: trust?.dataStatus,
    confidenceLevel: trust?.confidenceLevel,
    suppressionReason: trust?.suppressionReason,
    evidence: trust?.evidence,
    trustEvidence: trust?.trustEvidence
  }
}

export const buildMetricValuesFromRow = (row: MetricAggregateRowLike): MetricValue[] => {
  const trustMap = buildMetricTrustMapFromRow(row)

  return [
    metricValueFromRow('rpa', row.rpa_avg, trustMap),
    metricValueFromRow('otd_pct', row.otd_pct, trustMap),
    metricValueFromRow('ftr_pct', row.ftr_pct, trustMap),
    metricValueFromRow('cycle_time', row.cycle_time_avg_days, trustMap),
    metricValueFromRow('cycle_time_variance', row.cycle_time_variance, trustMap),
    metricValueFromRow('throughput', row.throughput_count, trustMap),
    metricValueFromRow('pipeline_velocity', row.pipeline_velocity, trustMap),
    metricValueFromRow('stuck_assets', row.stuck_asset_count, trustMap),
    metricValueFromRow('stuck_asset_pct', row.stuck_asset_pct, trustMap)
  ]
}

const parseCscDistribution = (raw: unknown, totalActive: number): CscDistributionEntry[] => {
  if (!raw || typeof raw !== 'string') return []

  try {
    const parsed = JSON.parse(raw) as Record<string, number>

    return Object.entries(parsed).map(([phase, count]) => ({
      phase: phase as CscPhase,
      label: CSC_PHASE_LABELS[phase as CscPhase] ?? phase,
      count,
      pct: totalActive > 0 ? Math.round((count / totalActive) * 1000) / 10 : 0
    }))
  } catch {
    return []
  }
}

const normalizeSnapshot = (
  row: SnapshotRow,
  source: 'materialized' | 'live'
): SpaceMetricSnapshot => {
  const activeTasks = toNumber(row.active_tasks)

  return {
    spaceId: normalizeString(row.space_id),
    clientId: row.client_id ? normalizeString(row.client_id) : null,
    clientName: row.client_name ? normalizeString(row.client_name) : null,
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    metrics: buildMetricValuesFromRow(row),
    cscDistribution: parseCscDistribution(row.csc_distribution, activeTasks),
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks,
      onTimeTasks: toNumber(row.on_time_count),
      lateDropTasks: toNumber(row.late_drop_count),
      overdueTasks: toNumber(row.overdue_count),
      carryOverTasks: toNumber(row.carry_over_count),
      overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
    },
    computedAt: toTimestampString(row.computed_at as string | { value?: string } | null),
    engineVersion: normalizeString(row.engine_version) || ENGINE_VERSION,
    source
  }
}

// ─── Read from Materialized Snapshots ───────────────────────────────────────

export const readSpaceMetrics = async (
  spaceId: string,
  periodYear: number,
  periodMonth: number
): Promise<SpaceMetricSnapshot | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<SnapshotRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
    WHERE space_id = @spaceId
      AND period_year = @periodYear
      AND period_month = @periodMonth
    ORDER BY computed_at DESC
    LIMIT 1
  `, { spaceId, periodYear, periodMonth })

  if (rows.length === 0) return null

  return normalizeSnapshot(rows[0], 'materialized')
}

export const readLatestSpaceMetrics = async (
  spaceId: string
): Promise<SpaceMetricSnapshot | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<SnapshotRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.v_metric_latest\`
    WHERE space_id = @spaceId
    LIMIT 1
  `, { spaceId })

  if (rows.length === 0) return null

  return normalizeSnapshot(rows[0], 'materialized')
}

export const readAgencyMetrics = async (
  periodYear: number,
  periodMonth: number
): Promise<SpaceMetricSnapshot[]> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<SnapshotRow>(`
    SELECT ms.*, COALESCE(c1.client_name, c2.client_name) AS client_name
    FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\` ms
    LEFT JOIN \`${projectId}.greenhouse.clients\` c1
      ON c1.client_id = ms.client_id
    LEFT JOIN \`${projectId}.greenhouse.clients\` c2
      ON c2.client_id = ms.space_id
    WHERE ms.period_year = @periodYear
      AND ms.period_month = @periodMonth
    ORDER BY COALESCE(c1.client_name, c2.client_name), ms.space_id
  `, { periodYear, periodMonth })

  return rows.map(row => normalizeSnapshot(row, 'materialized'))
}

// ─── Live Compute (from enriched view — no materialization needed) ──────────

export const computeSpaceMetricsLive = async (
  spaceId: string,
  periodYear: number,
  periodMonth: number
): Promise<SpaceMetricSnapshot | null> => {
  const projectId = getIcoEngineProjectId()

  // Run metric aggregation and CSC distribution in parallel
  const [metricRows, cscRows] = await Promise.all([
    runIcoEngineQuery<LiveMetricRow>(`
      SELECT
        space_id,
        ${buildMetricSelectSQL()}
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE space_id = @spaceId
        AND (${buildPeriodFilterSQL()})
      GROUP BY space_id
    `, { spaceId, periodYear, periodMonth }),

    runIcoEngineQuery<CscDistributionRow>(`
      SELECT
        space_id,
        fase_csc,
        COUNT(*) AS task_count
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE space_id = @spaceId
        AND ${CANONICAL_ACTIVE_CSC_TASK_SQL}
        AND (${buildPeriodFilterSQL()})
      GROUP BY space_id, fase_csc
      ORDER BY fase_csc
    `, { spaceId, periodYear, periodMonth })
  ])

  if (metricRows.length === 0) return null

  const row = metricRows[0]
  const activeTasks = toNumber(row.active_tasks)

  // Build CSC distribution from separate query
  const cscDistribution: CscDistributionEntry[] = cscRows.map(csc => ({
    phase: normalizeString(csc.fase_csc) as CscPhase,
    label: CSC_PHASE_LABELS[normalizeString(csc.fase_csc) as CscPhase] ?? normalizeString(csc.fase_csc),
    count: toNumber(csc.task_count),
    pct: activeTasks > 0 ? Math.round((toNumber(csc.task_count) / activeTasks) * 1000) / 10 : 0
  }))

  return {
    spaceId: normalizeString(row.space_id),
    clientId: null,
    clientName: null,
    periodYear,
    periodMonth,
    metrics: buildMetricValuesFromRow(row),
    cscDistribution,
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks,
      onTimeTasks: toNumber(row.on_time_count),
      lateDropTasks: toNumber(row.late_drop_count),
      overdueTasks: toNumber(row.overdue_count),
      carryOverTasks: toNumber(row.carry_over_count),
      overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
    },
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    source: 'live'
  }
}

// ─── Context-Agnostic Live Compute ──────────────────────────────────────────

interface GenericMetricRow {
  dimension_value: string
  rpa_avg: unknown
  rpa_median: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
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
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
}

/**
 * Generic live compute for ANY dimension.
 * Validates dimensionKey against ICO_DIMENSIONS (prevents SQL injection),
 * injects the column name, and passes the value as a BigQuery parameter.
 */
export const computeMetricsByContext = async (
  dimensionKey: IcoDimensionKey,
  dimensionValue: string,
  periodYear: number,
  periodMonth: number
): Promise<IcoMetricSnapshot | null> => {
  const dimConfig = ICO_DIMENSIONS[dimensionKey]

  if (!dimConfig) throw new Error(`Invalid ICO dimension: ${dimensionKey}`)

  const projectId = getIcoEngineProjectId()
  const column = dimConfig.column
  const baseTable = `\`${projectId}.${ICO_DATASET}.v_tasks_enriched\``

  const [metricRows, cscRows] = await Promise.all([
    runIcoEngineQuery<GenericMetricRow>(`
      SELECT
        @dimensionValue AS dimension_value,
        ${buildMetricSelectSQL()}
      FROM ${baseTable}
      WHERE ${column} = @dimensionValue
        AND (${buildPeriodFilterSQL()})
      GROUP BY dimension_value
    `, { dimensionValue, periodYear, periodMonth }),

    runIcoEngineQuery<CscDistributionRow>(`
      SELECT
        @dimensionValue AS space_id,
        fase_csc,
        COUNT(*) AS task_count
      FROM ${baseTable}
      WHERE ${column} = @dimensionValue
        AND ${CANONICAL_ACTIVE_CSC_TASK_SQL}
        AND (${buildPeriodFilterSQL()})
      GROUP BY space_id, fase_csc
      ORDER BY fase_csc
    `, { dimensionValue, periodYear, periodMonth })
  ])

  if (metricRows.length === 0) return null

  const row = metricRows[0]
  const activeTasks = toNumber(row.active_tasks)

  const cscDistribution: CscDistributionEntry[] = cscRows.map(csc => ({
    phase: normalizeString(csc.fase_csc) as CscPhase,
    label: CSC_PHASE_LABELS[normalizeString(csc.fase_csc) as CscPhase] ?? normalizeString(csc.fase_csc),
    count: toNumber(csc.task_count),
    pct: activeTasks > 0 ? Math.round((toNumber(csc.task_count) / activeTasks) * 1000) / 10 : 0
  }))

  return {
    dimension: dimensionKey,
    dimensionValue: normalizeString(row.dimension_value),
    dimensionLabel: null,
    periodYear,
    periodMonth,
    metrics: buildMetricValuesFromRow(row),
    cscDistribution,
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks,
      onTimeTasks: toNumber(row.on_time_count),
      lateDropTasks: toNumber(row.late_drop_count),
      overdueTasks: toNumber(row.overdue_count),
      carryOverTasks: toNumber(row.carry_over_count),
      overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
    },
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    source: 'live'
  }
}

// ─── Project-Level Metrics ──────────────────────────────────────────────────

interface ProjectMetricRow {
  project_source_id: string
  space_id: string
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
  rpa_median: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
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
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
}

export interface ProjectMetricSnapshot {
  projectSourceId: string
  spaceId: string
  periodYear: number
  periodMonth: number
  metrics: MetricValue[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
    onTimeTasks: number
    lateDropTasks: number
    overdueTasks: number
    carryOverTasks: number
    overdueCarriedForwardTasks: number
  }
}

export const readProjectMetrics = async (
  spaceId: string,
  periodYear: number,
  periodMonth: number
): Promise<ProjectMetricSnapshot[]> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<ProjectMetricRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_project\`
    WHERE space_id = @spaceId
      AND period_year = @periodYear
      AND period_month = @periodMonth
    ORDER BY throughput_count DESC
  `, { spaceId, periodYear, periodMonth })

  return rows.map(row => ({
    projectSourceId: normalizeString(row.project_source_id),
    spaceId: normalizeString(row.space_id),
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    metrics: buildMetricValuesFromRow(row),
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks: toNumber(row.active_tasks),
      onTimeTasks: toNumber(row.on_time_count),
      lateDropTasks: toNumber(row.late_drop_count),
      overdueTasks: toNumber(row.overdue_count),
      carryOverTasks: toNumber(row.carry_over_count),
      overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
    }
  }))
}

// ─── Member-Level Metrics ────────────────────────────────────────────────────

interface MemberMetricRow {
  member_id: string
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
  rpa_median: unknown
  rpa_eligible_task_count: unknown
  rpa_missing_task_count: unknown
  rpa_non_positive_task_count: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
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
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
  materialized_at: unknown
}

const hasIncompleteMemberMaterialization = (row: MemberMetricRow): boolean => {
  const totalTasks = toNumber(row.total_tasks)
  const completedTasks = toNumber(row.completed_tasks)

  if (totalTasks <= 0) {
    return false
  }

  if ([row.on_time_count, row.late_drop_count, row.overdue_count, row.carry_over_count, row.overdue_carried_forward_count].some(
    value => value === null || value === undefined
  )) {
    return true
  }

  if (completedTasks <= 0) {
    return false
  }

  return [row.rpa_eligible_task_count, row.rpa_missing_task_count, row.rpa_non_positive_task_count].some(
    value => value === null || value === undefined
  )
}

export const readMemberMetrics = async (
  memberId: string,
  periodYear: number,
  periodMonth: number
): Promise<IcoMetricSnapshot | null> => {
  const projectId = getIcoEngineProjectId()

  const [rows, cscRows] = await Promise.all([
    runIcoEngineQuery<MemberMetricRow>(`
      SELECT *
      FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
      WHERE member_id = @memberId
        AND period_year = @periodYear
        AND period_month = @periodMonth
      LIMIT 1
    `, { memberId, periodYear, periodMonth }),

    runIcoEngineQuery<CscDistributionRow>(`
      SELECT
        @memberId AS space_id,
        fase_csc,
        COUNT(*) AS task_count
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\` te
      WHERE te.primary_owner_member_id = @memberId
        AND ${CANONICAL_ACTIVE_CSC_TASK_SQL}
        AND (${buildPeriodFilterSQL()})
      GROUP BY space_id, fase_csc
      ORDER BY fase_csc
    `, { memberId, periodYear, periodMonth })
  ])

  if (rows.length === 0) return null

  const row = rows[0]

  // Some early TASK-189 rows were materialized before the period buckets were
  // fully persisted. In that case prefer a live compute over returning stale
  // member context that makes the period look empty/incomplete.
  if (hasIncompleteMemberMaterialization(row)) {
    return computeMetricsByContext('member', memberId, periodYear, periodMonth)
  }

  const activeTasks = toNumber(row.active_tasks)

  const cscDistribution: CscDistributionEntry[] = cscRows.map(csc => ({
    phase: normalizeString(csc.fase_csc) as CscPhase,
    label: CSC_PHASE_LABELS[normalizeString(csc.fase_csc) as CscPhase] ?? normalizeString(csc.fase_csc),
    count: toNumber(csc.task_count),
    pct: activeTasks > 0 ? Math.round((toNumber(csc.task_count) / activeTasks) * 1000) / 10 : 0
  }))

  return {
    dimension: 'member',
    dimensionValue: normalizeString(row.member_id),
    dimensionLabel: null,
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    metrics: buildMetricValuesFromRow(row),
    cscDistribution,
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks,
      onTimeTasks: toNumber(row.on_time_count),
      lateDropTasks: toNumber(row.late_drop_count),
      overdueTasks: toNumber(row.overdue_count),
      carryOverTasks: toNumber(row.carry_over_count),
      overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
    },
    computedAt: toTimestampString(row.materialized_at as string | { value?: string } | null),
    engineVersion: ENGINE_VERSION,
    source: 'materialized'
  }
}

export const readMemberMetricsBatch = async (
  memberIds: string[],
  periodYear: number,
  periodMonth: number
): Promise<Map<string, IcoMetricSnapshot>> => {
  const normalizedMemberIds = Array.from(
    new Set(memberIds.map(memberId => normalizeString(memberId)).filter(Boolean))
  )

  if (normalizedMemberIds.length === 0) {
    return new Map()
  }

  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<MemberMetricRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
    WHERE member_id IN UNNEST(@memberIds)
      AND period_year = @periodYear
      AND period_month = @periodMonth
  `, { memberIds: normalizedMemberIds, periodYear, periodMonth })

  const snapshots = new Map<string, IcoMetricSnapshot>()
  const staleMemberIds: string[] = []

  for (const row of rows) {
    const memberId = normalizeString(row.member_id)

    if (!memberId) {
      continue
    }

    if (hasIncompleteMemberMaterialization(row)) {
      staleMemberIds.push(memberId)
      continue
    }

    snapshots.set(memberId, {
      dimension: 'member',
      dimensionValue: memberId,
      dimensionLabel: null,
      periodYear: toNumber(row.period_year),
      periodMonth: toNumber(row.period_month),
      metrics: buildMetricValuesFromRow(row),
      cscDistribution: [],
      context: {
        totalTasks: toNumber(row.total_tasks),
        completedTasks: toNumber(row.completed_tasks),
        activeTasks: toNumber(row.active_tasks),
        onTimeTasks: toNumber(row.on_time_count),
        lateDropTasks: toNumber(row.late_drop_count),
        overdueTasks: toNumber(row.overdue_count),
        carryOverTasks: toNumber(row.carry_over_count),
        overdueCarriedForwardTasks: toNumber(row.overdue_carried_forward_count)
      },
      computedAt: toTimestampString(row.materialized_at as string | { value?: string } | null),
      engineVersion: ENGINE_VERSION,
      source: 'materialized'
    })
  }

  if (staleMemberIds.length > 0) {
    const liveSnapshots = await Promise.all(
      staleMemberIds.map(async memberId => ({
        memberId,
        snapshot: await computeMetricsByContext('member', memberId, periodYear, periodMonth)
      }))
    )

    for (const { memberId, snapshot } of liveSnapshots) {
      if (snapshot) {
        snapshots.set(memberId, snapshot)
      }
    }
  }

  return snapshots
}

// ─── Summary for Creative Hub / Capability consumption ──────────────────────

export interface MetricsSummary {
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  throughput: number | null
  cycleTimeDays: number | null
  source: 'materialized'
}

export const readLatestMetricsSummary = async (
  spaceId: string
): Promise<MetricsSummary | null> => {
  const snapshot = await readLatestSpaceMetrics(spaceId)

  if (!snapshot) return null

  const getVal = (id: string) => snapshot.metrics.find(m => m.metricId === id)?.value ?? null

  return {
    rpaAvg: getVal('rpa'),
    otdPct: getVal('otd_pct'),
    ftrPct: getVal('ftr_pct'),
    throughput: getVal('throughput'),
    cycleTimeDays: getVal('cycle_time'),
    source: 'materialized'
  }
}

export const readMetricsSummaryByClientId = async (
  clientId: string
): Promise<MetricsSummary | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<SnapshotRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.v_metric_latest\`
    WHERE client_id = @clientId
    LIMIT 1
  `, { clientId })

  if (rows.length === 0) return null

  const snapshot = normalizeSnapshot(rows[0], 'materialized')
  const getVal = (id: string) => snapshot.metrics.find(m => m.metricId === id)?.value ?? null

  return {
    rpaAvg: getVal('rpa'),
    otdPct: getVal('otd_pct'),
    ftrPct: getVal('ftr_pct'),
    throughput: getVal('throughput'),
    cycleTimeDays: getVal('cycle_time'),
    source: 'materialized'
  }
}
