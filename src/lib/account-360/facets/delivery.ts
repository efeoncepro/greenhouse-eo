import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AccountScope,
  AccountFacetContext,
  AccountDeliveryFacet,
  AccountDeliveryIcoMetrics
} from '@/types/account-complete-360'

// ── Postgres row types ──

interface IcoMetricsRow extends Record<string, unknown> {
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  throughput_count: string | number | null
  cycle_time_avg: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  stuck_asset_pct: string | number | null
}

interface ProjectCountRow extends Record<string, unknown> {
  project_count: string | number
  active_project_count: string | number
}

interface TaskCountRow extends Record<string, unknown> {
  total: string | number
  completed: string | number
  active: string | number
  overdue: string | number
  carry_over: string | number
}

interface SprintCountRow extends Record<string, unknown> {
  sprint_count: string | number
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  
return n === 0 && v !== 0 && v !== '0' ? null : n
}

// ── Period resolution ──

const resolvePeriod = (asOf: string | null): { year: number; month: number } => {
  if (asOf) {
    const d = new Date(asOf)

    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    }
  }

  const now = new Date()

  
return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// ── Sub-queries ──

const queryIcoMetrics = async (
  organizationId: string,
  year: number,
  month: number
): Promise<IcoMetricsRow | null> => {
  const rows = await runGreenhousePostgresQuery<IcoMetricsRow>(`
    SELECT rpa_avg, rpa_median, otd_pct, ftr_pct, throughput_count,
      cycle_time_avg, pipeline_velocity, stuck_asset_count, stuck_asset_pct
    FROM greenhouse_serving.ico_organization_metrics
    WHERE organization_id = $1
      AND period_year = $2 AND period_month = $3
    LIMIT 1
  `, [organizationId, year, month]).catch(() => [] as IcoMetricsRow[])

  return rows[0] ?? null
}

const queryProjectCounts = async (
  spaceIds: string[]
): Promise<ProjectCountRow | null> => {
  if (spaceIds.length === 0) return null

  const rows = await runGreenhousePostgresQuery<ProjectCountRow>(`
    SELECT
      COUNT(*) as project_count,
      COUNT(*) FILTER (WHERE active = TRUE) as active_project_count
    FROM greenhouse_delivery.projects
    WHERE space_id = ANY($1)
  `, [spaceIds]).catch(() => [] as ProjectCountRow[])

  return rows[0] ?? null
}

const queryTaskCounts = async (
  spaceIds: string[]
): Promise<TaskCountRow | null> => {
  if (spaceIds.length === 0) return null

  const rows = await runGreenhousePostgresQuery<TaskCountRow>(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'active' OR status = 'in_progress') as active,
      COUNT(*) FILTER (WHERE is_overdue = TRUE) as overdue,
      COUNT(*) FILTER (WHERE is_carry_over = TRUE) as carry_over
    FROM greenhouse_delivery.tasks t
    JOIN greenhouse_delivery.projects p ON p.project_id = t.project_id
    WHERE p.space_id = ANY($1)
  `, [spaceIds]).catch(() => [] as TaskCountRow[])

  return rows[0] ?? null
}

const querySprintCount = async (
  spaceIds: string[]
): Promise<number> => {
  if (spaceIds.length === 0) return 0

  const rows = await runGreenhousePostgresQuery<SprintCountRow>(`
    SELECT COUNT(*) as sprint_count
    FROM greenhouse_delivery.sprints s
    JOIN greenhouse_delivery.projects p ON p.project_id = s.project_id
    WHERE p.space_id = ANY($1)
  `, [spaceIds]).catch(() => [] as SprintCountRow[])

  return rows[0] ? toNum(rows[0].sprint_count) : 0
}

// ── Mappers ──

const mapIcoMetrics = (row: IcoMetricsRow): AccountDeliveryIcoMetrics => ({
  rpaAvg: toNullNum(row.rpa_avg),
  rpaMedian: toNullNum(row.rpa_median),
  otdPct: toNullNum(row.otd_pct),
  ftrPct: toNullNum(row.ftr_pct),
  throughputCount: toNum(row.throughput_count),
  cycleTimeAvg: toNullNum(row.cycle_time_avg),
  pipelineVelocity: toNullNum(row.pipeline_velocity),
  stuckAssetCount: toNum(row.stuck_asset_count),
  stuckAssetPct: toNullNum(row.stuck_asset_pct)
})

// ── Public facet fetcher ──

export const fetchDeliveryFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountDeliveryFacet | null> => {
  if (scope.spaceIds.length === 0) return null

  const { year, month } = resolvePeriod(ctx.asOf)

  const [icoRow, projectRow, taskRow, sprintCount] = await Promise.all([
    queryIcoMetrics(scope.organizationId, year, month),
    queryProjectCounts(scope.spaceIds),
    queryTaskCounts(scope.spaceIds),
    querySprintCount(scope.spaceIds)
  ])

  const icoMetrics = icoRow ? mapIcoMetrics(icoRow) : null
  const projectCount = projectRow ? toNum(projectRow.project_count) : 0
  const activeProjectCount = projectRow ? toNum(projectRow.active_project_count) : 0

  const taskCounts = taskRow
    ? {
        total: toNum(taskRow.total),
        completed: toNum(taskRow.completed),
        active: toNum(taskRow.active),
        overdue: toNum(taskRow.overdue),
        carryOver: toNum(taskRow.carry_over)
      }
    : { total: 0, completed: 0, active: 0, overdue: 0, carryOver: 0 }

  return {
    icoMetrics,
    projectCount,
    activeProjectCount,
    sprintCount,
    taskCounts
  }
}
