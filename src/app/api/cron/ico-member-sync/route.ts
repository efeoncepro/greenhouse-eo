import { NextResponse } from 'next/server'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

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
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  if (typeof v === 'object' && v !== null && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startMs = Date.now()
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    // Sync last 3 months (covers late materializations)
    const now = new Date()
    const periods: Array<{ year: number; month: number }> = []

    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)

      periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }

    let totalUpserted = 0

    for (const { year, month } of periods) {
      const [rows] = await bigQuery.query({
        query: `SELECT *
                FROM \`${projectId}.ico_engine.metrics_by_member\`
                WHERE period_year = @year AND period_month = @month`,
        params: { year, month }
      })

      for (const raw of rows as BqRow[]) {
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
        totalUpserted++
      }
    }

    const durationMs = Date.now() - startMs

    console.log(`[ico-member-sync] ${totalUpserted} rows upserted across ${periods.length} periods in ${durationMs}ms`)

    return NextResponse.json({
      upserted: totalUpserted,
      periods: periods.map(p => `${p.year}-${String(p.month).padStart(2, '0')}`),
      durationMs
    })
  } catch (error) {
    console.error('[ico-member-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
