/**
 * Materialize ICO member-level metrics from v_tasks_enriched.
 * This runs the same SQL as Step 7 of materializeMonthlySnapshots.
 *
 * Usage: npx tsx scripts/materialize-member-metrics.ts
 */
import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()

  const projectId = getGoogleProjectId()
  const bq = new BigQuery(getGoogleAuthOptions())

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  console.log(`=== Materialize member metrics for ${year}-${String(month).padStart(2, '0')} ===\n`)

  // Delete existing member metrics for current period
  try {
    await bq.query({
      query: `DELETE FROM \`${projectId}.ico_engine.metrics_by_member\`
              WHERE period_year = @year AND period_month = @month`,
      params: { year, month }
    })

    console.log('Cleared existing member metrics for current period')
  } catch (e) {
    console.log('No existing metrics to clear:', (e as Error).message?.slice(0, 60))
  }

  // Materialize member-level metrics using UNNEST on assignee_member_ids
  const query = `
    INSERT INTO \`${projectId}.ico_engine.metrics_by_member\`
    (member_id, period_year, period_month,
     rpa_avg, rpa_median, otd_pct, ftr_pct,
     cycle_time_avg_days, throughput_count, pipeline_velocity,
     stuck_asset_count, stuck_asset_pct,
     total_tasks, completed_tasks, active_tasks,
     materialized_at)

    SELECT
      member_id,
      @year AS period_year,
      @month AS period_month,

      ROUND(AVG(CASE
        WHEN te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')
          AND SAFE_CAST(te.rpa_value AS FLOAT64) > 0
        THEN SAFE_CAST(te.rpa_value AS FLOAT64)
      END), 2) AS rpa_avg,

      ROUND(APPROX_QUANTILES(
        CASE
          WHEN te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')
            AND SAFE_CAST(te.rpa_value AS FLOAT64) > 0
          THEN SAFE_CAST(te.rpa_value AS FLOAT64)
        END, 100
      )[SAFE_OFFSET(50)], 2) AS rpa_median,

      ROUND(SAFE_DIVIDE(
        COUNTIF(te.delivery_signal = 'on_time' AND te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')),
        NULLIF(COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')), 0)
      ) * 100, 1) AS otd_pct,

      ROUND(SAFE_DIVIDE(
        COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado') AND COALESCE(te.client_review_open, FALSE) = FALSE),
        NULLIF(COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')), 0)
      ) * 100, 1) AS ftr_pct,

      ROUND(AVG(CASE WHEN te.cycle_time_days > 0 THEN te.cycle_time_days END), 1) AS cycle_time_avg_days,

      COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')) AS throughput_count,

      ROUND(SAFE_DIVIDE(
        COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')),
        NULLIF(COUNTIF(te.task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado')), 0)
      ), 2) AS pipeline_velocity,

      COUNTIF(te.is_stuck = TRUE) AS stuck_asset_count,

      ROUND(SAFE_DIVIDE(
        COUNTIF(te.is_stuck = TRUE),
        NULLIF(COUNTIF(te.task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado')), 0)
      ) * 100, 1) AS stuck_asset_pct,

      COUNT(*) AS total_tasks,
      COUNTIF(te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')) AS completed_tasks,
      COUNTIF(te.task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado')) AS active_tasks,

      CURRENT_TIMESTAMP() AS materialized_at

    FROM \`${projectId}.ico_engine.v_tasks_enriched\` te,
    UNNEST(IFNULL(te.assignee_member_ids, [])) AS member_id

    WHERE member_id IS NOT NULL AND member_id != ''
      AND (
        (te.task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')
         AND EXTRACT(YEAR FROM te.completed_at) = @year
         AND EXTRACT(MONTH FROM te.completed_at) = @month)
        OR
        te.task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado')
      )

    GROUP BY member_id
  `

  console.log('Running member metrics materialization...')

  const [result] = await bq.query({ query, params: { year, month } })

  console.log(`Materialized ${result.length ?? 'N/A'} rows`)

  // Verify
  const [countRows] = await bq.query({
    query: `SELECT COUNT(*) as cnt FROM \`${projectId}.ico_engine.metrics_by_member\`
            WHERE period_year = @year AND period_month = @month`,
    params: { year, month }
  })

  console.log(`metrics_by_member for ${year}-${month}: ${countRows[0]?.cnt} rows`)

  // Now sync to Postgres
  console.log('\n=== Syncing to Postgres ===\n')

  const [allRows] = await bq.query({
    query: `SELECT member_id, period_year, period_month,
             rpa_avg, rpa_median, otd_pct, ftr_pct,
             cycle_time_avg_days, throughput_count, pipeline_velocity,
             stuck_asset_count, stuck_asset_pct,
             total_tasks, completed_tasks, active_tasks
           FROM \`${projectId}.ico_engine.metrics_by_member\`
           WHERE period_year = @year AND period_month = @month`,
    params: { year, month }
  })

  console.log(`Rows to sync: ${allRows.length}`)

  if (allRows.length > 0) {
    const { applyGreenhousePostgresProfile } = await import('./lib/load-greenhouse-tool-env')

    applyGreenhousePostgresProfile('runtime')

    const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('../src/lib/postgres/client')

    let synced = 0

    for (const r of allRows as Array<Record<string, unknown>>) {
      try {
        await runGreenhousePostgresQuery(`
          INSERT INTO greenhouse_serving.ico_member_metrics (
            member_id, period_year, period_month,
            rpa_avg, rpa_median, otd_pct, ftr_pct,
            cycle_time_avg_days, throughput_count, pipeline_velocity,
            stuck_asset_count, stuck_asset_pct,
            total_tasks, completed_tasks, active_tasks, materialized_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
            rpa_avg=EXCLUDED.rpa_avg, rpa_median=EXCLUDED.rpa_median,
            otd_pct=EXCLUDED.otd_pct, ftr_pct=EXCLUDED.ftr_pct,
            cycle_time_avg_days=EXCLUDED.cycle_time_avg_days,
            throughput_count=EXCLUDED.throughput_count, pipeline_velocity=EXCLUDED.pipeline_velocity,
            stuck_asset_count=EXCLUDED.stuck_asset_count, stuck_asset_pct=EXCLUDED.stuck_asset_pct,
            total_tasks=EXCLUDED.total_tasks, completed_tasks=EXCLUDED.completed_tasks,
            active_tasks=EXCLUDED.active_tasks, materialized_at=NOW()
        `, [
          String(r.member_id), Number(r.period_year), Number(r.period_month),
          r.rpa_avg != null ? Number(r.rpa_avg) : null,
          r.rpa_median != null ? Number(r.rpa_median) : null,
          r.otd_pct != null ? Number(r.otd_pct) : null,
          r.ftr_pct != null ? Number(r.ftr_pct) : null,
          r.cycle_time_avg_days != null ? Number(r.cycle_time_avg_days) : null,
          r.throughput_count != null ? Number(r.throughput_count) : null,
          r.pipeline_velocity != null ? Number(r.pipeline_velocity) : null,
          r.stuck_asset_count != null ? Number(r.stuck_asset_count) : null,
          r.stuck_asset_pct != null ? Number(r.stuck_asset_pct) : null,
          r.total_tasks != null ? Number(r.total_tasks) : null,
          r.completed_tasks != null ? Number(r.completed_tasks) : null,
          r.active_tasks != null ? Number(r.active_tasks) : null
        ])

        synced++
      } catch (e) {
        console.error(`Sync failed for ${r.member_id}:`, (e as Error).message?.slice(0, 60))
      }
    }

    console.log(`Synced: ${synced} rows to ico_member_metrics`)

    await closeGreenhousePostgres()
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
