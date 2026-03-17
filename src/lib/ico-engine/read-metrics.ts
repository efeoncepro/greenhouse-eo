import 'server-only'

import { runIcoEngineQuery, getIcoEngineProjectId, toNumber, toNullableNumber, normalizeString, toTimestampString } from './shared'
import { ICO_DATASET, ENGINE_VERSION } from './schema'
import type { ThresholdZone } from './metric-registry'
import { ICO_METRIC_REGISTRY, getThresholdZone, CSC_PHASE_LABELS, type CscPhase } from './metric-registry'

// ─── Row Types (match BigQuery columns) ─────────────────────────────────────

interface SnapshotRow {
  snapshot_id: string
  space_id: string
  client_id: unknown
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
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
  computed_at: unknown
  engine_version: unknown
}

interface LiveMetricRow {
  space_id: string
  rpa_avg: unknown
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
  periodYear: number
  periodMonth: number
  metrics: MetricValue[]
  cscDistribution: CscDistributionEntry[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
  }
  computedAt: string | null
  engineVersion: string
  source: 'materialized' | 'live'
}

// ─── Normalizers ────────────────────────────────────────────────────────────

const metricValueFromRow = (
  metricId: string,
  rawValue: unknown
): MetricValue => {
  const value = toNullableNumber(rawValue)
  const metric = ICO_METRIC_REGISTRY.find(m => m.id === metricId)
  const zone = metric && value !== null ? getThresholdZone(metric, value) : null

  return { metricId, value, zone }
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
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    metrics: [
      metricValueFromRow('rpa', row.rpa_avg),
      metricValueFromRow('otd_pct', row.otd_pct),
      metricValueFromRow('ftr_pct', row.ftr_pct),
      metricValueFromRow('cycle_time', row.cycle_time_avg_days),
      metricValueFromRow('cycle_time_variance', row.cycle_time_variance),
      metricValueFromRow('throughput', row.throughput_count),
      metricValueFromRow('pipeline_velocity', row.pipeline_velocity),
      metricValueFromRow('stuck_assets', row.stuck_asset_count),
      metricValueFromRow('stuck_asset_pct', row.stuck_asset_pct)
    ],
    cscDistribution: parseCscDistribution(row.csc_distribution, activeTasks),
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks
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
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
    ORDER BY space_id
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
        -- RPA: average of non-zero rpa_value for completed tasks in period
        ROUND(AVG(CASE
          WHEN completed_at IS NOT NULL AND rpa_value > 0
          THEN SAFE_CAST(rpa_value AS FLOAT64)
        END), 2) AS rpa_avg,

        -- OTD: on-time / (on-time + late)
        ROUND(SAFE_DIVIDE(
          COUNTIF(delivery_signal = 'on_time'),
          COUNTIF(delivery_signal IN ('on_time', 'late'))
        ) * 100, 1) AS otd_pct,

        -- FTR: no client changes / total completed
        ROUND(SAFE_DIVIDE(
          COUNTIF(completed_at IS NOT NULL AND client_change_round_final = 0),
          COUNTIF(completed_at IS NOT NULL)
        ) * 100, 1) AS ftr_pct,

        -- Cycle time avg (completed tasks only)
        ROUND(AVG(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_avg_days,

        -- Cycle time P50
        ROUND(APPROX_QUANTILES(
          CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END, 100
        )[SAFE_OFFSET(50)], 1) AS cycle_time_p50_days,

        -- Cycle time variance (stddev)
        ROUND(STDDEV(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_variance,

        -- Throughput (completed count)
        COUNTIF(completed_at IS NOT NULL) AS throughput_count,

        -- Pipeline velocity (completed / active)
        ROUND(SAFE_DIVIDE(
          COUNTIF(completed_at IS NOT NULL),
          COUNTIF(
            task_status NOT IN ('Listo','Done','Finalizado','Completado','Archivadas','Cancelada','Canceled','Cancelled')
          )
        ), 2) AS pipeline_velocity,

        -- Stuck assets
        COUNTIF(is_stuck = TRUE) AS stuck_asset_count,
        ROUND(SAFE_DIVIDE(
          COUNTIF(is_stuck = TRUE),
          COUNTIF(
            task_status NOT IN ('Listo','Done','Finalizado','Completado','Archivadas','Cancelada','Canceled','Cancelled')
          )
        ) * 100, 1) AS stuck_asset_pct,

        -- Context
        COUNT(*) AS total_tasks,
        COUNTIF(completed_at IS NOT NULL) AS completed_tasks,
        COUNTIF(
          task_status NOT IN ('Listo','Done','Finalizado','Completado','Archivadas','Cancelada','Canceled','Cancelled')
        ) AS active_tasks

      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE space_id = @spaceId
        AND (
          -- Include tasks completed in the target period
          (completed_at IS NOT NULL
            AND EXTRACT(YEAR FROM completed_at) = @periodYear
            AND EXTRACT(MONTH FROM completed_at) = @periodMonth)
          OR
          -- Include currently active tasks (for stuck/pipeline/distribution)
          (completed_at IS NULL
            AND task_status NOT IN ('Listo','Done','Finalizado','Completado'))
        )
      GROUP BY space_id
    `, { spaceId, periodYear, periodMonth }),

    runIcoEngineQuery<CscDistributionRow>(`
      SELECT
        space_id,
        fase_csc,
        COUNT(*) AS task_count
      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE space_id = @spaceId
        AND completed_at IS NULL
        AND task_status NOT IN ('Listo','Done','Finalizado','Completado')
        AND fase_csc != 'otros'
      GROUP BY space_id, fase_csc
      ORDER BY fase_csc
    `, { spaceId })
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
    periodYear,
    periodMonth,
    metrics: [
      metricValueFromRow('rpa', row.rpa_avg),
      metricValueFromRow('otd_pct', row.otd_pct),
      metricValueFromRow('ftr_pct', row.ftr_pct),
      metricValueFromRow('cycle_time', row.cycle_time_avg_days),
      metricValueFromRow('cycle_time_variance', row.cycle_time_variance),
      metricValueFromRow('throughput', row.throughput_count),
      metricValueFromRow('pipeline_velocity', row.pipeline_velocity),
      metricValueFromRow('stuck_assets', row.stuck_asset_count),
      metricValueFromRow('stuck_asset_pct', row.stuck_asset_pct)
    ],
    cscDistribution,
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks),
      activeTasks
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
  ftr_pct: unknown
  total_tasks: unknown
  completed_tasks: unknown
  cycle_time_avg_days: unknown
  cycle_time_p50_days: unknown
  cycle_time_variance: unknown
  otd_pct: unknown
  throughput_count: unknown
  stuck_asset_count: unknown
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
    metrics: [
      metricValueFromRow('rpa', row.rpa_avg),
      metricValueFromRow('otd_pct', row.otd_pct),
      metricValueFromRow('ftr_pct', row.ftr_pct),
      metricValueFromRow('cycle_time', row.cycle_time_avg_days),
      metricValueFromRow('cycle_time_variance', row.cycle_time_variance),
      metricValueFromRow('throughput', row.throughput_count),
      metricValueFromRow('stuck_assets', row.stuck_asset_count)
    ],
    context: {
      totalTasks: toNumber(row.total_tasks),
      completedTasks: toNumber(row.completed_tasks)
    }
  }))
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
