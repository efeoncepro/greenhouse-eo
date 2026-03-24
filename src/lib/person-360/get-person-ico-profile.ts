import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

interface IcoMetricsRow extends Record<string, unknown> {
  member_id: string
  period_year: number
  period_month: number
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  throughput_count: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  stuck_asset_pct: string | number | null
  total_tasks: string | number | null
  completed_tasks: string | number | null
  active_tasks: string | number | null
}

export interface IcoMetricPeriod {
  periodYear: number
  periodMonth: number
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
  pipelineVelocity: number | null
  stuckAssetCount: number | null
  stuckAssetPct: number | null
  totalTasks: number | null
  completedTasks: number | null
  activeTasks: number | null
}

export interface PersonIcoProfile {
  memberId: string
  hasData: boolean
  current: IcoMetricPeriod | null
  trend: IcoMetricPeriod[]
  health: 'green' | 'yellow' | 'red' | null
}

// ── Helpers ──

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : null }

  return null
}

const mapRow = (row: IcoMetricsRow): IcoMetricPeriod => ({
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  rpaAvg: toNum(row.rpa_avg),
  rpaMedian: toNum(row.rpa_median),
  otdPct: toNum(row.otd_pct),
  ftrPct: toNum(row.ftr_pct),
  cycleTimeAvgDays: toNum(row.cycle_time_avg_days),
  throughputCount: toNum(row.throughput_count),
  pipelineVelocity: toNum(row.pipeline_velocity),
  stuckAssetCount: toNum(row.stuck_asset_count),
  stuckAssetPct: toNum(row.stuck_asset_pct),
  totalTasks: toNum(row.total_tasks),
  completedTasks: toNum(row.completed_tasks),
  activeTasks: toNum(row.active_tasks)
})

const computeHealth = (m: IcoMetricPeriod): 'green' | 'yellow' | 'red' => {
  const rpa = m.rpaAvg ?? 0
  const otd = m.otdPct ?? 0

  if (rpa >= 70 && otd >= 80) return 'green'
  if (rpa >= 40 && otd >= 50) return 'yellow'

  return 'red'
}

// ── Main function ──

export const getPersonIcoProfile = async (
  memberId: string,
  trendMonths = 6
): Promise<PersonIcoProfile> => {
  // Get current period (latest available)
  const currentRows = await runGreenhousePostgresQuery<IcoMetricsRow>(
    `SELECT *
     FROM greenhouse_serving.ico_member_metrics
     WHERE member_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [memberId]
  )

  if (currentRows.length === 0) {
    return {
      memberId,
      hasData: false,
      current: null,
      trend: [],
      health: null
    }
  }

  const current = mapRow(currentRows[0])

  // Get trend (last N months)
  const trendRows = await runGreenhousePostgresQuery<IcoMetricsRow>(
    `SELECT *
     FROM greenhouse_serving.ico_member_metrics
     WHERE member_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT $2`,
    [memberId, trendMonths]
  )

  const trend = trendRows.map(mapRow).reverse()

  return {
    memberId,
    hasData: true,
    current,
    trend,
    health: computeHealth(current)
  }
}
