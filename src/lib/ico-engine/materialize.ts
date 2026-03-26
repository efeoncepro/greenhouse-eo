import 'server-only'

import { runIcoEngineQuery, getIcoEngineProjectId, toNumber, buildMetricSelectSQL, buildPeriodFilterSQL, DONE_STATUSES_SQL } from './shared'
import { ensureIcoEngineInfrastructure, ICO_DATASET, ENGINE_VERSION } from './schema'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MaterializationResult {
  spacesProcessed: number
  snapshotsWritten: number
  stuckAssetsWritten: number
  rpaTrendRowsWritten: number
  projectMetricsWritten: number
  memberMetricsWritten: number
  sprintMetricsWritten: number
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
        ANY_VALUE(client_id) AS client_id,
        @periodYear AS period_year,
        @periodMonth AS period_month,

        ${buildMetricSelectSQL()},

        -- Will be populated in step 2
        CAST(NULL AS STRING) AS csc_distribution,

        CURRENT_TIMESTAMP() AS computed_at,
        @engineVersion AS engine_version

      FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
      WHERE space_id IS NOT NULL
        AND (${buildPeriodFilterSQL()})
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
    WHERE space_id IS NOT NULL
      AND completed_at IS NULL
      AND task_status NOT IN (${DONE_STATUSES_SQL})
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

  // Update csc_distribution for all spaces in a single batched UPDATE
  if (cscBySpace.size > 0) {
    const whenClauses: string[] = []
    const snapshotIds: string[] = []

    for (const [spaceId, distribution] of cscBySpace) {
      const snapshotId = `${spaceId}-${periodYear}-${String(periodMonth).padStart(2, '0')}`

      snapshotIds.push(snapshotId)

      const escapedJson = JSON.stringify(distribution).replace(/\\/g, '\\\\').replace(/'/g, "\\'")

      whenClauses.push(`WHEN snapshot_id = '${snapshotId}' THEN '${escapedJson}'`)
    }

    await runIcoEngineQuery(`
      UPDATE \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
      SET csc_distribution = CASE ${whenClauses.join(' ')} ELSE csc_distribution END
      WHERE snapshot_id IN UNNEST(@ids)
    `, { ids: snapshotIds })

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

  // Step 7: Materialize member-level metrics for current period
  const memberMetricsWritten = await materializeMemberMetrics(projectId, periodYear, periodMonth)

  // Step 7b: Publish ico.materialization.completed for each affected member
  if (memberMetricsWritten > 0) {
    try {
      const memberRows = await runIcoEngineQuery<{ member_id: string }>(
        `SELECT DISTINCT member_id FROM \`${projectId}.ico_engine.metrics_by_member\`
         WHERE period_year = @year AND period_month = @month`,
        { year: periodYear, month: periodMonth }
      )

      const memberIds = memberRows.map(r => r.member_id).filter(Boolean)

      // Import publishOutboxEvent lazily to avoid circular deps
      const { publishOutboxEvent } = await import('@/lib/sync/publish-event')

      for (const memberId of memberIds) {
        await publishOutboxEvent({
          aggregateType: 'ico_materialization',
          aggregateId: `ico-mat-${periodYear}-${periodMonth}-${memberId}`,
          eventType: 'ico.materialization.completed',
          payload: { memberId, periodYear, periodMonth, memberMetricsWritten }
        }).catch(() => {
          // Non-blocking — outbox publish failure should not break materialization
        })
      }
    } catch {
      // Non-blocking — if outbox not available, materialization still succeeds
    }
  }

  // Step 8: Materialize sprint-level metrics for current period
  const sprintMetricsWritten = await materializeSprintMetrics(projectId, periodYear, periodMonth)

  return {
    spacesProcessed: totalSnapshots,
    snapshotsWritten: totalSnapshots,
    stuckAssetsWritten,
    rpaTrendRowsWritten,
    projectMetricsWritten,
    memberMetricsWritten,
    sprintMetricsWritten,
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
    WHERE space_id IS NOT NULL AND is_stuck = TRUE
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
    WHERE space_id IS NOT NULL
      AND completed_at IS NOT NULL
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
       rpa_avg, rpa_median, otd_pct, ftr_pct,
       cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
       throughput_count, pipeline_velocity,
       stuck_asset_count, stuck_asset_pct,
       total_tasks, completed_tasks, active_tasks,
       materialized_at)
    SELECT
      project_source_id,
      space_id,
      @periodYear AS period_year,
      @periodMonth AS period_month,

      ${buildMetricSelectSQL()},

      CURRENT_TIMESTAMP() AS materialized_at

    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE space_id IS NOT NULL
      AND project_source_id IS NOT NULL
      AND project_source_id != ''
      AND (${buildPeriodFilterSQL()})
    GROUP BY project_source_id, space_id
  `, { periodYear, periodMonth })

  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_project\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  return toNumber(countRows[0]?.cnt)
}

// ─── Member-Level Metrics Materialization ────────────────────────────────────

const materializeMemberMetrics = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
): Promise<number> => {
  // Delete current period rows then re-insert (idempotent)
  await runIcoEngineQuery(`
    DELETE FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  await runIcoEngineQuery(`
    INSERT INTO \`${projectId}.${ICO_DATASET}.metrics_by_member\`
      (member_id, period_year, period_month,
       rpa_avg, rpa_median, otd_pct, ftr_pct,
       cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
       throughput_count, pipeline_velocity,
       stuck_asset_count, stuck_asset_pct,
       total_tasks, completed_tasks, active_tasks,
       materialized_at)
    SELECT
      member_id,
      @periodYear AS period_year,
      @periodMonth AS period_month,

      ${buildMetricSelectSQL()},

      CURRENT_TIMESTAMP() AS materialized_at

    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\` te,
         UNNEST(te.assignee_member_ids) AS member_id
    WHERE member_id IS NOT NULL
      AND member_id != ''
      AND (${buildPeriodFilterSQL()})
    GROUP BY member_id
  `, { periodYear, periodMonth })

  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  return toNumber(countRows[0]?.cnt)
}

// ─── Sprint-Level Metrics Materialization ────────────────────────────────────

const materializeSprintMetrics = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
): Promise<number> => {
  await runIcoEngineQuery(`
    DELETE FROM \`${projectId}.${ICO_DATASET}.metrics_by_sprint\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  await runIcoEngineQuery(`
    INSERT INTO \`${projectId}.${ICO_DATASET}.metrics_by_sprint\`
      (sprint_source_id, space_id, period_year, period_month,
       rpa_avg, rpa_median, otd_pct, ftr_pct,
       cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
       throughput_count, pipeline_velocity,
       stuck_asset_count, stuck_asset_pct,
       total_tasks, completed_tasks, active_tasks,
       materialized_at)
    SELECT
      sprint_source_id,
      space_id,
      @periodYear AS period_year,
      @periodMonth AS period_month,

      ${buildMetricSelectSQL()},

      CURRENT_TIMESTAMP() AS materialized_at

    FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\`
    WHERE space_id IS NOT NULL
      AND sprint_source_id IS NOT NULL
      AND sprint_source_id != ''
      AND (${buildPeriodFilterSQL()})
    GROUP BY sprint_source_id, space_id
  `, { periodYear, periodMonth })

  const sprintCountRows = await runIcoEngineQuery<{ cnt: unknown }>(`
    SELECT COUNT(*) AS cnt
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_sprint\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `, { periodYear, periodMonth })

  return toNumber(sprintCountRows[0]?.cnt)
}
