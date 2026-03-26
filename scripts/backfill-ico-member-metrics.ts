/**
 * Backfill: BigQuery ico_engine.metrics_by_member → Postgres greenhouse_serving.ico_member_metrics
 *
 * Reads all member metrics from BigQuery and upserts to Postgres.
 * Usage: npx tsx scripts/backfill-ico-member-metrics.ts
 */

import { getBigQueryClient, getBigQueryProjectId } from '../src/lib/bigquery'
import { runGreenhousePostgresQuery } from '../src/lib/postgres/client'

interface BqRow {
  member_id: string
  period_year: number
  period_month: number
  rpa_avg: number | null
  rpa_median: number | null
  otd_pct: number | null
  ftr_pct: number | null
  cycle_time_avg_days: number | null
  throughput_count: number | null
  pipeline_velocity: number | null
  stuck_asset_count: number | null
  stuck_asset_pct: number | null
  total_tasks: number | null
  completed_tasks: number | null
  active_tasks: number | null
  materialized_at: { value: string } | string | null
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : null }

  if (typeof v === 'object' && v !== null && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

async function main() {
  console.log('=== Backfill: ico_engine.metrics_by_member → Postgres ===\n')

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `SELECT * FROM \`${projectId}.ico_engine.metrics_by_member\` ORDER BY period_year, period_month, member_id`
  })

  console.log(`Read ${rows.length} rows from BigQuery`)

  let upserted = 0
  let errors = 0

  for (const raw of rows as BqRow[]) {
    try {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_serving.ico_member_metrics (
          member_id, period_year, period_month,
          rpa_avg, rpa_median, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count, pipeline_velocity,
          stuck_asset_count, stuck_asset_pct,
          total_tasks, completed_tasks, active_tasks,
          materialized_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
          rpa_avg = EXCLUDED.rpa_avg,
          rpa_median = EXCLUDED.rpa_median,
          otd_pct = EXCLUDED.otd_pct,
          ftr_pct = EXCLUDED.ftr_pct,
          cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
          throughput_count = EXCLUDED.throughput_count,
          pipeline_velocity = EXCLUDED.pipeline_velocity,
          stuck_asset_count = EXCLUDED.stuck_asset_count,
          stuck_asset_pct = EXCLUDED.stuck_asset_pct,
          total_tasks = EXCLUDED.total_tasks,
          completed_tasks = EXCLUDED.completed_tasks,
          active_tasks = EXCLUDED.active_tasks,
          materialized_at = NOW()`,
        [
          raw.member_id, raw.period_year, raw.period_month,
          toNum(raw.rpa_avg), toNum(raw.rpa_median), toNum(raw.otd_pct), toNum(raw.ftr_pct),
          toNum(raw.cycle_time_avg_days), toNum(raw.throughput_count), toNum(raw.pipeline_velocity),
          toNum(raw.stuck_asset_count), toNum(raw.stuck_asset_pct),
          toNum(raw.total_tasks), toNum(raw.completed_tasks), toNum(raw.active_tasks)
        ]
      )
      upserted++
    } catch (err) {
      errors++
      console.error(`Error upserting ${raw.member_id} ${raw.period_year}-${raw.period_month}:`, err)
    }
  }

  console.log(`\nDone. Upserted: ${upserted}, Errors: ${errors}`)
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
