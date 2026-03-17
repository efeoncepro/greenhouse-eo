import 'server-only'

import { runIcoEngineQuery, getIcoEngineProjectId, toNumber } from './shared'
import { ensureIcoEngineInfrastructure, ICO_DATASET, ENGINE_VERSION } from './schema'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MaterializationResult {
  spacesProcessed: number
  snapshotsWritten: number
  stuckAssetsWritten: number
  rpaTrendRowsWritten: number
  projectMetricsWritten: number
  durationMs: number
  periodYear: number
  periodMonth: number
  engineVersion: string
}

interface CscDistributionRow {
  space_id: string
  fase_csc: string
  task_count: unknown
}

// ─── Done / Excluded Status Lists ───────────────────────────────────────────

const DONE_STATUSES = `'Listo','Done','Finalizado','Completado'`
const EXCLUDED_STATUSES = `'Listo','Done','Finalizado','Completado','Archivadas','Cancelada','Canceled','Cancelled'`

// ─── Materialization ────────────────────────────────────────────────────────

export const materializeMonthlySnapshots = async (
  year?: number,
  month?: number
): Promise<MaterializationResult> => {
  const start = Date.now()
  const projectId = getIcoEngineProjectId()

  await ensureIcoEngineInfrastructure()

  const now = new Date()
  const periodYear = year ?? now.getFullYear()
  const periodMonth = month ?? (now.getMonth() + 1)

  // Step 1: MERGE metric aggregation across all spaces in a single query.
  // This computes all metrics per space and upserts into metric_snapshots_monthly.
  await runIcoEngineQuery(`
    MERGE \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\` AS target
    USING (
      SELECT
        CONCAT(space_id, '-', CAST(@periodYear AS STRING), '-', LPAD(CAST(@periodMonth AS STRING), 2, '0')) AS snapshot_id,
        space_id,
        CAST(NULL AS STRING) AS client_id,
        @periodYear AS period_year,
        @periodMonth AS period_month,

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

        -- Cycle time avg (completed only)
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
          COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES}))
        ), 2) AS pipeline_velocity,

        -- Stuck assets
        COUNTIF(is_stuck = TRUE) AS stuck_asset_count,
        ROUND(SAFE_DIVIDE(
          COUNTIF(is_stuck = TRUE),
          COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES}))
        ) * 100, 1) AS stuck_asset_pct,

        -- Will be populated in step 2
        CAST(NULL AS STRING) AS csc_distribution,

        -- Context
        COUNT(*) AS total_tasks,
        COUNTIF(completed_at IS NOT NULL) AS completed_tasks,
        COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES})) AS active_tasks,

        CURRENT_TIMESTAMP() AS computed_at,
        @engineVersion AS engine_version

      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE (
          completed_at IS NOT NULL
          AND EXTRACT(YEAR FROM completed_at) = @periodYear
          AND EXTRACT(MONTH FROM completed_at) = @periodMonth
        )
        OR (
          completed_at IS NULL
          AND task_status NOT IN (${DONE_STATUSES})
        )
      GROUP BY space_id
    ) AS source
    ON target.snapshot_id = source.snapshot_id
    WHEN MATCHED THEN UPDATE SET
      client_id = source.client_id,
      period_year = source.period_year,
      period_month = source.period_month,
      rpa_avg = source.rpa_avg,
      otd_pct = source.otd_pct,
      ftr_pct = source.ftr_pct,
      cycle_time_avg_days = source.cycle_time_avg_days,
      cycle_time_p50_days = source.cycle_time_p50_days,
      cycle_time_variance = source.cycle_time_variance,
      throughput_count = source.throughput_count,
      pipeline_velocity = source.pipeline_velocity,
      stuck_asset_count = source.stuck_asset_count,
      stuck_asset_pct = source.stuck_asset_pct,
      total_tasks = source.total_tasks,
      completed_tasks = source.completed_tasks,
      active_tasks = source.active_tasks,
      computed_at = source.computed_at,
      engine_version = source.engine_version
    WHEN NOT MATCHED THEN INSERT (
      snapshot_id, space_id, client_id,
      period_year, period_month,
      rpa_avg, otd_pct, ftr_pct,
      cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
      throughput_count, pipeline_velocity,
      stuck_asset_count, stuck_asset_pct,
      csc_distribution,
      total_tasks, completed_tasks, active_tasks,
      computed_at, engine_version
    ) VALUES (
      source.snapshot_id, source.space_id, source.client_id,
      source.period_year, source.period_month,
      source.rpa_avg, source.otd_pct, source.ftr_pct,
      source.cycle_time_avg_days, source.cycle_time_p50_days, source.cycle_time_variance,
      source.throughput_count, source.pipeline_velocity,
      source.stuck_asset_count, source.stuck_asset_pct,
      source.csc_distribution,
      source.total_tasks, source.completed_tasks, source.active_tasks,
      source.computed_at, source.engine_version
    )
  `, { periodYear, periodMonth, engineVersion: ENGINE_VERSION })

  // Step 2: Compute CSC distribution per space and update the snapshots.
  // Run as a separate query since MERGE cannot combine with the JSON aggregation easily.
  const cscRows = await runIcoEngineQuery<CscDistributionRow>(`
    SELECT
      space_id,
      fase_csc,
      COUNT(*) AS task_count
    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE completed_at IS NULL
      AND task_status NOT IN (${DONE_STATUSES})
      AND fase_csc != 'otros'
    GROUP BY space_id, fase_csc
    ORDER BY space_id, fase_csc
  `)

  // Group CSC rows by space_id → JSON string
  const cscBySpace = new Map<string, Record<string, number>>()

  for (const row of cscRows) {
    const spaceId = String(row.space_id).trim()
    const phase = String(row.fase_csc).trim()
    const count = toNumber(row.task_count)

    if (!cscBySpace.has(spaceId)) {
      cscBySpace.set(spaceId, {})
    }

    cscBySpace.get(spaceId)![phase] = count
  }

  // Update csc_distribution for each space that has data
  const spacesProcessed = cscBySpace.size
  let snapshotsWritten = 0

  for (const [spaceId, distribution] of cscBySpace) {
    const snapshotId = `${spaceId}-${periodYear}-${String(periodMonth).padStart(2, '0')}`

    await runIcoEngineQuery(`
      UPDATE \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
      SET csc_distribution = @cscJson
      WHERE snapshot_id = @snapshotId
    `, { cscJson: JSON.stringify(distribution), snapshotId })

    snapshotsWritten++
  }

  // Step 3: Count total snapshots written/updated this run
  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  const totalSnapshots = toNumber(countRows[0]?.cnt)

  // Step 4: Materialize stuck assets detail (full refresh)
  const stuckAssetsWritten = await materializeStuckAssetsDetail(projectId)

  // Step 5: Materialize RPA trend (full refresh — last 12 months)
  const rpaTrendRowsWritten = await materializeRpaTrend(projectId)

  // Step 6: Materialize project-level metrics for current period
  const projectMetricsWritten = await materializeProjectMetrics(projectId, periodYear, periodMonth)

  return {
    spacesProcessed: totalSnapshots,
    snapshotsWritten: totalSnapshots,
    stuckAssetsWritten,
    rpaTrendRowsWritten,
    projectMetricsWritten,
    durationMs: Date.now() - start,
    periodYear,
    periodMonth,
    engineVersion: ENGINE_VERSION
  }
}

// ─── Stuck Assets Detail Materialization ─────────────────────────────────────

const materializeStuckAssetsDetail = async (projectId: string): Promise<number> => {
  // Full refresh — delete all, re-insert current stuck assets
  await runIcoEngineQuery(`
    DELETE FROM \`${projectId}.${ICO_DATASET}.stuck_assets_detail\`
    WHERE TRUE
  `)

  await runIcoEngineQuery(`
    INSERT INTO \`${projectId}.${ICO_DATASET}.stuck_assets_detail\`
      (task_source_id, task_name, space_id, project_source_id, fase_csc,
       hours_since_update, days_since_update, severity,
       rpa_value, client_review_open, materialized_at)
    SELECT
      task_source_id,
      task_name,
      space_id,
      project_source_id,
      fase_csc,
      hours_since_update,
      ROUND(hours_since_update / 24.0, 1) AS days_since_update,
      CASE WHEN hours_since_update >= 96 THEN 'danger' ELSE 'warning' END AS severity,
      SAFE_CAST(rpa_value AS FLOAT64),
      client_review_open,
      CURRENT_TIMESTAMP()
    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE is_stuck = TRUE
  `)

  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.stuck_assets_detail\`
  `)

  return toNumber(countRows[0]?.cnt)
}

// ─── RPA Trend Materialization ───────────────────────────────────────────────

const materializeRpaTrend = async (projectId: string): Promise<number> => {
  // Full refresh — last 12 months of RPA data by space and month
  await runIcoEngineQuery(`
    DELETE FROM \`${projectId}.${ICO_DATASET}.rpa_trend\`
    WHERE TRUE
  `)

  await runIcoEngineQuery(`
    INSERT INTO \`${projectId}.${ICO_DATASET}.rpa_trend\`
      (space_id, period_year, period_month, rpa_avg, rpa_median, tasks_completed, materialized_at)
    SELECT
      space_id,
      EXTRACT(YEAR FROM completed_at) AS period_year,
      EXTRACT(MONTH FROM completed_at) AS period_month,
      ROUND(AVG(CASE WHEN rpa_value > 0 THEN SAFE_CAST(rpa_value AS FLOAT64) END), 2) AS rpa_avg,
      ROUND(APPROX_QUANTILES(
        CASE WHEN rpa_value > 0 THEN SAFE_CAST(rpa_value AS FLOAT64) END, 100
      )[SAFE_OFFSET(50)], 2) AS rpa_median,
      COUNT(*) AS tasks_completed,
      CURRENT_TIMESTAMP() AS materialized_at
    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE completed_at IS NOT NULL
      AND completed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
    GROUP BY space_id, period_year, period_month
    HAVING tasks_completed > 0
  `)

  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.rpa_trend\`
  `)

  return toNumber(countRows[0]?.cnt)
}

// ─── Project-Level Metrics Materialization ───────────────────────────────────

const materializeProjectMetrics = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
): Promise<number> => {
  // Delete current period rows then re-insert (idempotent)
  await runIcoEngineQuery(`
    DELETE FROM \`${projectId}.${ICO_DATASET}.metrics_by_project\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  await runIcoEngineQuery(`
    INSERT INTO \`${projectId}.${ICO_DATASET}.metrics_by_project\`
      (project_source_id, space_id, period_year, period_month,
       rpa_avg, rpa_median, ftr_pct, total_tasks, completed_tasks,
       cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
       otd_pct, throughput_count, stuck_asset_count, materialized_at)
    SELECT
      project_source_id,
      space_id,
      @periodYear AS period_year,
      @periodMonth AS period_month,

      ROUND(AVG(CASE
        WHEN completed_at IS NOT NULL AND rpa_value > 0
        THEN SAFE_CAST(rpa_value AS FLOAT64)
      END), 2) AS rpa_avg,

      ROUND(APPROX_QUANTILES(
        CASE WHEN completed_at IS NOT NULL AND rpa_value > 0
          THEN SAFE_CAST(rpa_value AS FLOAT64) END, 100
      )[SAFE_OFFSET(50)], 2) AS rpa_median,

      ROUND(SAFE_DIVIDE(
        COUNTIF(completed_at IS NOT NULL AND client_change_round_final = 0),
        COUNTIF(completed_at IS NOT NULL)
      ) * 100, 1) AS ftr_pct,

      COUNT(*) AS total_tasks,
      COUNTIF(completed_at IS NOT NULL) AS completed_tasks,

      ROUND(AVG(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_avg_days,

      ROUND(APPROX_QUANTILES(
        CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END, 100
      )[SAFE_OFFSET(50)], 1) AS cycle_time_p50_days,

      ROUND(STDDEV(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_variance,

      ROUND(SAFE_DIVIDE(
        COUNTIF(delivery_signal = 'on_time'),
        COUNTIF(delivery_signal IN ('on_time', 'late'))
      ) * 100, 1) AS otd_pct,

      COUNTIF(completed_at IS NOT NULL) AS throughput_count,
      COUNTIF(is_stuck = TRUE) AS stuck_asset_count,

      CURRENT_TIMESTAMP() AS materialized_at

    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE project_source_id IS NOT NULL
      AND project_source_id != ''
      AND (
        (completed_at IS NOT NULL
          AND EXTRACT(YEAR FROM completed_at) = @periodYear
          AND EXTRACT(MONTH FROM completed_at) = @periodMonth)
        OR
        (completed_at IS NULL
          AND task_status NOT IN (${DONE_STATUSES}))
      )
    GROUP BY project_source_id, space_id
  `, { periodYear, periodMonth })

  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_project\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  return toNumber(countRows[0]?.cnt)
}
