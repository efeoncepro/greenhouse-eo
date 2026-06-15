import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { observeAndRethrow } from '@/lib/account-360/facet-observability'
import {
  readOrganizationOperationalMetricsRow,
  type OrganizationOperationalMetricsRow
} from '@/lib/account-360/organization-operational-metrics-reader'
import { TASK_STATUS_GROUPS, taskStatusGroupSql } from '@/lib/delivery/task-status-canonical'
import type {
  AccountScope,
  AccountFacetContext,
  AccountDeliveryFacet,
  AccountDeliveryIcoMetrics
} from '@/types/account-complete-360'

// ── Postgres row types ──

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

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
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
  `, [spaceIds]).catch(observeAndRethrow('delivery', 'account360.delivery.project_counts'))

  return rows[0] ?? null
}

const queryTaskCounts = async (
  spaceIds: string[]
): Promise<TaskCountRow | null> => {
  if (spaceIds.length === 0) return null

  // Counts MUST go through the canonical task-status vocabulary (CLAUDE.md "Canonical task status
  // vocabulary V1"): tasks.task_status carries the Spanish canonical values + legacy aliases
  // (Aprobado / En curso / Sin empezar / …), NOT 'completed'/'active'. Hardcoding English literals
  // (the prior `status = 'completed'`) referenced a column that does not exist and silently zeroed
  // every count. Overdue/carry-over derive from the real columns (due_date, days_late, is_rescheduled);
  // there is no is_overdue/is_carry_over column.
  const completedOrExcludedSql = taskStatusGroupSql([
    ...TASK_STATUS_GROUPS.COMPLETED,
    ...TASK_STATUS_GROUPS.EXCLUDED
  ])

  const rows = await runGreenhousePostgresQuery<TaskCountRow>(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE t.task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)})) as completed,
      COUNT(*) FILTER (WHERE t.task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.ACTIVE)})) as active,
      COUNT(*) FILTER (
        WHERE t.due_date IS NOT NULL
          AND t.due_date < CURRENT_DATE
          AND t.task_status NOT IN (${completedOrExcludedSql})
      ) as overdue,
      COUNT(*) FILTER (WHERE t.is_rescheduled = TRUE) as carry_over
    FROM greenhouse_delivery.tasks t
    JOIN greenhouse_delivery.projects p ON p.project_record_id = t.project_record_id
    WHERE p.space_id = ANY($1)
  `, [spaceIds]).catch(observeAndRethrow('delivery', 'account360.delivery.task_counts'))

  return rows[0] ?? null
}

const querySprintCount = async (
  spaceIds: string[]
): Promise<number> => {
  if (spaceIds.length === 0) return 0

  const rows = await runGreenhousePostgresQuery<SprintCountRow>(`
    SELECT COUNT(*) as sprint_count
    FROM greenhouse_delivery.sprints s
    JOIN greenhouse_delivery.projects p ON p.project_record_id = s.project_record_id
    WHERE p.space_id = ANY($1)
  `, [spaceIds]).catch(observeAndRethrow('delivery', 'account360.delivery.sprint_count'))

  return rows[0] ? toNum(rows[0].sprint_count) : 0
}

// ── Mappers ──

// The ICO metrics now flow through the canonical reader (TASK-1106) which resolves
// operational serving ⊕ ico mirror ⊕ BigQuery once and returns normalized number|null fields.
const mapToDeliveryIco = (row: OrganizationOperationalMetricsRow): AccountDeliveryIcoMetrics => ({
  periodYear: row.periodYear,
  periodMonth: row.periodMonth,
  rpaAvg: row.rpaAvg,
  rpaMedian: row.rpaMedian,
  otdPct: row.otdPct,
  ftrPct: row.ftrPct,
  throughputCount: row.throughputCount ?? 0,
  cycleTimeAvg: row.cycleTimeAvgDays,
  pipelineVelocity: row.pipelineVelocity,
  stuckAssetCount: row.stuckAssetCount,
  stuckAssetPct: row.stuckAssetPct
})

const previousPeriod = (year: number, month: number) => {
  if (month > 1) return { year, month: month - 1 }

  return { year: year - 1, month: 12 }
}

const sameIcoPeriod = (
  a: OrganizationOperationalMetricsRow | null,
  b: OrganizationOperationalMetricsRow | null
) =>
  Boolean(
    a &&
    b &&
    a.periodYear === b.periodYear &&
    a.periodMonth === b.periodMonth
  )

// ── Public facet fetcher ──

export const fetchDeliveryFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountDeliveryFacet | null> => {
  if (scope.spaceIds.length === 0) return null

  const { year, month } = resolvePeriod(ctx.asOf)

  const [icoRow, projectRow, taskRow, sprintCount] = await Promise.all([
    readOrganizationOperationalMetricsRow(scope.organizationId, { periodYear: year, periodMonth: month }),
    queryProjectCounts(scope.spaceIds),
    queryTaskCounts(scope.spaceIds),
    querySprintCount(scope.spaceIds)
  ])

  const prior = icoRow
    ? previousPeriod(icoRow.periodYear || year, icoRow.periodMonth || month)
    : previousPeriod(year, month)

  const previousIcoRow = icoRow
    ? await readOrganizationOperationalMetricsRow(scope.organizationId, {
        periodYear: prior.year,
        periodMonth: prior.month
      })
    : null

  const icoMetrics = icoRow ? mapToDeliveryIco(icoRow) : null
  const previousIcoMetrics = previousIcoRow && !sameIcoPeriod(icoRow, previousIcoRow) ? mapToDeliveryIco(previousIcoRow) : null
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
    previousIcoMetrics,
    projectCount,
    activeProjectCount,
    sprintCount,
    taskCounts
  }
}
