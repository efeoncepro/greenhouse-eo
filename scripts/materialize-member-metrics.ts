/**
 * Materialize ICO member-level metrics using the canonical ICO engine.
 * This script is a thin wrapper over materializeMonthlySnapshots + Postgres sync
 * so it does not drift from the engine contract.
 *
 * Usage: npx tsx scripts/materialize-member-metrics.ts
 */
import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'
import { buildMetricTrustMapFromRow, serializeMetricTrustMap } from '@/lib/ico-engine/metric-trust-policy'
import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()

  const projectId = getGoogleProjectId()
  const bq = new BigQuery(getGoogleAuthOptions())

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  console.log(`=== Materialize member metrics for ${year}-${String(month).padStart(2, '0')} ===\n`)

  console.log('Running canonical ICO materialization...')
  const result = await materializeMonthlySnapshots(year, month)

  console.log(`Materialized ${result.memberMetricsWritten} member rows via canonical engine`)

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
             total_tasks, completed_tasks, active_tasks, carry_over_count,
             rpa_eligible_task_count, rpa_missing_task_count, rpa_non_positive_task_count
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
            total_tasks, completed_tasks, active_tasks, carry_over_count,
            metric_trust_json,
            materialized_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
          ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
            rpa_avg=EXCLUDED.rpa_avg, rpa_median=EXCLUDED.rpa_median,
            otd_pct=EXCLUDED.otd_pct, ftr_pct=EXCLUDED.ftr_pct,
            cycle_time_avg_days=EXCLUDED.cycle_time_avg_days,
            throughput_count=EXCLUDED.throughput_count, pipeline_velocity=EXCLUDED.pipeline_velocity,
            stuck_asset_count=EXCLUDED.stuck_asset_count, stuck_asset_pct=EXCLUDED.stuck_asset_pct,
            total_tasks=EXCLUDED.total_tasks, completed_tasks=EXCLUDED.completed_tasks,
            active_tasks=EXCLUDED.active_tasks, carry_over_count=EXCLUDED.carry_over_count,
            metric_trust_json=EXCLUDED.metric_trust_json, materialized_at=NOW()
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
          r.active_tasks != null ? Number(r.active_tasks) : null,
          r.carry_over_count != null ? Number(r.carry_over_count) : null,
          serializeMetricTrustMap(buildMetricTrustMapFromRow(r as unknown as Parameters<typeof buildMetricTrustMapFromRow>[0]))
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
