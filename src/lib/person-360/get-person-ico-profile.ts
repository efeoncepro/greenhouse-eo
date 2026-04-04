import 'server-only'

import { getOrganizationClientIds } from '@/lib/account-360/organization-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  buildMetricSelectSQL,
  buildPeriodFilterSQL,
  getIcoEngineProjectId,
  runIcoEngineQuery
} from '@/lib/ico-engine/shared'
import { buildMetricTrustMapFromRow, parseMetricTrustMap, type MetricTrustMap } from '@/lib/ico-engine/metric-trust-policy'
import { ICO_DATASET } from '@/lib/ico-engine/schema'

interface IcoMetricsRow extends Record<string, unknown> {
  member_id: string
  period_year: number
  period_month: number
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  cycle_time_variance: string | number | null
  throughput_count: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  stuck_asset_pct: string | number | null
  total_tasks: string | number | null
  completed_tasks: string | number | null
  active_tasks: string | number | null
  on_time_count: string | number | null
  late_drop_count: string | number | null
  overdue_count: string | number | null
  carry_over_count: string | number | null
  overdue_carried_forward_count: string | number | null
  rpa_eligible_task_count?: string | number | null
  rpa_missing_task_count?: string | number | null
  rpa_non_positive_task_count?: string | number | null
  metric_trust_json?: unknown
}

interface PeriodRow {
  period_year: number | string
  period_month: number | string
}

export interface IcoMetricPeriod {
  periodYear: number
  periodMonth: number
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  cycleTimeVariance: number | null
  throughputCount: number | null
  pipelineVelocity: number | null
  stuckAssetCount: number | null
  stuckAssetPct: number | null
  totalTasks: number | null
  completedTasks: number | null
  activeTasks: number | null
  onTimeCount: number | null
  lateDropCount: number | null
  overdueCount: number | null
  carryOverCount: number | null
  overdueCarriedForwardCount: number | null
  metricTrust: MetricTrustMap | null
}

export interface PersonIcoProfile {
  memberId: string
  hasData: boolean
  current: IcoMetricPeriod | null
  trend: IcoMetricPeriod[]
  health: 'green' | 'yellow' | 'red' | null
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  return null
}

const str = (v: string | null | undefined): string | null =>
  v ? v.trim() || null : null

const mapRow = (row: IcoMetricsRow): IcoMetricPeriod => {
  const parsedTrust = parseMetricTrustMap(row.metric_trust_json)
  const metricTrust = Object.keys(parsedTrust).length > 0 ? parsedTrust : buildMetricTrustMapFromRow(row)

  return {
    periodYear: Number(row.period_year),
    periodMonth: Number(row.period_month),
    rpaAvg: toNum(row.rpa_avg),
    rpaMedian: toNum(row.rpa_median),
    otdPct: toNum(row.otd_pct),
    ftrPct: toNum(row.ftr_pct),
    cycleTimeAvgDays: toNum(row.cycle_time_avg_days),
    cycleTimeVariance: toNum(row.cycle_time_variance),
    throughputCount: toNum(row.throughput_count),
    pipelineVelocity: toNum(row.pipeline_velocity),
    stuckAssetCount: toNum(row.stuck_asset_count),
    stuckAssetPct: toNum(row.stuck_asset_pct),
    totalTasks: toNum(row.total_tasks),
    completedTasks: toNum(row.completed_tasks),
    activeTasks: toNum(row.active_tasks),
    onTimeCount: toNum(row.on_time_count),
    lateDropCount: toNum(row.late_drop_count),
    overdueCount: toNum(row.overdue_count),
    carryOverCount: toNum(row.carry_over_count),
    overdueCarriedForwardCount: toNum(row.overdue_carried_forward_count),
    metricTrust
  }
}

const computeHealth = (m: IcoMetricPeriod): 'green' | 'yellow' | 'red' => {
  const rpa = m.rpaAvg ?? 0
  const otd = m.otdPct ?? 0

  if (rpa >= 70 && otd >= 80) return 'green'
  if (rpa >= 40 && otd >= 50) return 'yellow'

  return 'red'
}

const previousPeriod = (year: number, month: number) =>
  month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }

const buildTrailingPeriods = (year: number, month: number, count: number) => {
  const periods: Array<{ year: number; month: number }> = []
  let cursor = { year, month }

  for (let index = 0; index < count; index += 1) {
    periods.push(cursor)
    cursor = previousPeriod(cursor.year, cursor.month)
  }

  return periods
}

const readScopedPeriods = async (memberId: string, clientIds: string[], limit: number) => {
  const projectId = getIcoEngineProjectId()

  return runIcoEngineQuery<PeriodRow>(
    `SELECT
       EXTRACT(YEAR FROM COALESCE(period_anchor_date, due_date, DATE(created_at), DATE(synced_at))) AS period_year,
       EXTRACT(MONTH FROM COALESCE(period_anchor_date, due_date, DATE(created_at), DATE(synced_at))) AS period_month
     FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\` te
     WHERE te.primary_owner_member_id = @memberId
       AND client_id IN UNNEST(@clientIds)
       AND COALESCE(period_anchor_date, due_date, DATE(created_at), DATE(synced_at)) IS NOT NULL
     GROUP BY period_year, period_month
     ORDER BY period_year DESC, period_month DESC
     LIMIT @limit`,
    { memberId, clientIds, limit }
  )
}

const readScopedSnapshot = async (
  memberId: string,
  clientIds: string[],
  periodYear: number,
  periodMonth: number
): Promise<IcoMetricPeriod | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<IcoMetricsRow>(
    `SELECT
       @memberId AS member_id,
       @periodYear AS period_year,
       @periodMonth AS period_month,
       ${buildMetricSelectSQL()}
     FROM \`${projectId}.${ICO_DATASET}.v_tasks_enriched\` te
     WHERE te.primary_owner_member_id = @memberId
       AND client_id IN UNNEST(@clientIds)
       AND (${buildPeriodFilterSQL()})
     GROUP BY member_id, period_year, period_month`,
    { memberId, clientIds, periodYear, periodMonth }
  )

  return rows[0] ? mapRow(rows[0]) : null
}

const readPostgresSnapshot = async (
  memberId: string,
  periodYear: number,
  periodMonth: number
): Promise<IcoMetricPeriod | null> => {
  const rows = await runGreenhousePostgresQuery<IcoMetricsRow>(
    `SELECT *
     FROM greenhouse_serving.ico_member_metrics
     WHERE member_id = $1
       AND period_year = $2
       AND period_month = $3
     LIMIT 1`,
    [memberId, periodYear, periodMonth]
  )

  return rows[0] ? mapRow(rows[0]) : null
}

export const readPersonIcoSnapshot = async (
  memberId: string,
  periodYear: number,
  periodMonth: number,
  options: {
    organizationId?: string | null
  } = {}
): Promise<IcoMetricPeriod | null> => {
  const organizationId = str(options.organizationId)

  if (!organizationId) {
    return readPostgresSnapshot(memberId, periodYear, periodMonth)
  }

  const clientIds = await getOrganizationClientIds(organizationId)

  if (clientIds.length === 0) {
    return null
  }

  return readScopedSnapshot(memberId, clientIds, periodYear, periodMonth)
}

export const getPersonIcoProfile = async (
  memberId: string,
  trendMonths = 6,
  options: {
    organizationId?: string | null
  } = {}
): Promise<PersonIcoProfile> => {
  const organizationId = str(options.organizationId)

  if (!organizationId) {
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

  const clientIds = await getOrganizationClientIds(organizationId)

  if (clientIds.length === 0) {
    return {
      memberId,
      hasData: false,
      current: null,
      trend: [],
      health: null
    }
  }

  const latestPeriods = await readScopedPeriods(memberId, clientIds, 1)

  if (latestPeriods.length === 0) {
    return {
      memberId,
      hasData: false,
      current: null,
      trend: [],
      health: null
    }
  }

  const latest = latestPeriods[0]
  const periods = buildTrailingPeriods(Number(latest.period_year), Number(latest.period_month), Math.min(trendMonths, 24))

  const snapshots = await Promise.all(
    periods.map(period => readScopedSnapshot(memberId, clientIds, period.year, period.month))
  )

  const trend = snapshots.filter((snapshot): snapshot is IcoMetricPeriod => snapshot !== null).reverse()
  const current = trend.length > 0 ? trend[trend.length - 1] : null

  return {
    memberId,
    hasData: current !== null,
    current,
    trend,
    health: current ? computeHealth(current) : null
  }
}
