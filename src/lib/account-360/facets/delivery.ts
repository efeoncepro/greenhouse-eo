import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { observeAndDegrade, observeAndRethrow } from '@/lib/account-360/facet-observability'
import { readOrganizationIcoMetricsFromBigQuery } from '@/lib/account-360/organization-ico-metrics-source'
import { TASK_STATUS_GROUPS, taskStatusGroupSql } from '@/lib/delivery/task-status-canonical'
import type {
  AccountScope,
  AccountFacetContext,
  AccountDeliveryFacet,
  AccountDeliveryIcoMetrics
} from '@/types/account-complete-360'

// ── Postgres row types ──

interface IcoMetricsRow extends Record<string, unknown> {
  period_year: string | number | null
  period_month: string | number | null
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  throughput_count: string | number | null
  cycle_time_avg_days: string | number | null
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
    WITH materialized AS (
      SELECT
        rpa_avg,
        rpa_median,
        otd_pct,
        ftr_pct,
        throughput_count,
        cycle_time_avg_days,
        pipeline_velocity,
        stuck_asset_count,
        stuck_asset_pct,
        period_year,
        period_month,
        0 AS source_rank
      FROM greenhouse_serving.organization_operational_metrics
      WHERE organization_id = $1
        AND (period_year < $2 OR (period_year = $2 AND period_month <= $3))

      UNION ALL

      SELECT
        rpa_avg,
        rpa_median,
        otd_pct,
        ftr_pct,
        throughput_count,
        cycle_time_avg_days,
        pipeline_velocity,
        stuck_asset_count,
        stuck_asset_pct,
        period_year,
        period_month,
        1 AS source_rank
      FROM greenhouse_serving.ico_organization_metrics
      WHERE organization_id = $1
        AND (period_year < $2 OR (period_year = $2 AND period_month <= $3))
    )
    SELECT
      period_year,
      period_month,
      rpa_avg,
      rpa_median,
      otd_pct,
      ftr_pct,
      throughput_count,
      cycle_time_avg_days,
      pipeline_velocity,
      stuck_asset_count,
      stuck_asset_pct
    FROM materialized
    ORDER BY period_year DESC, period_month DESC, source_rank ASC
    LIMIT 1
  `, [organizationId, year, month]).catch(
    // PG serving tables (organization_operational_metrics / ico_organization_metrics) are a
    // projection that is frequently empty for client orgs. Degrade to the canonical BigQuery
    // source below rather than failing the whole delivery facet — but still observe a genuine error.
    observeAndDegrade('delivery', 'account360.delivery.ico_serving', [] as IcoMetricsRow[])
  )

  if (rows[0]) return rows[0]

  // Canonical source-of-truth fallback: the ICO materializer (TASK-900) writes
  // `ico_engine.metrics_by_organization` in BigQuery, keyed by the space client_id. The PG serving
  // tables above are only an (often-unpopulated) mirror. ICO null is an honest "not materialized
  // yet" state, so degrade rather than throw if BigQuery is unreachable.
  const bigQueryRow = await readOrganizationIcoMetricsFromBigQuery({
    organizationId,
    periodYear: year,
    periodMonth: month,
    mode: 'latest_at_or_before'
  }).catch(observeAndDegrade('delivery', 'account360.delivery.ico_bigquery', null))

  if (!bigQueryRow) return null

  return {
    period_year: bigQueryRow.period_year as IcoMetricsRow['period_year'],
    period_month: bigQueryRow.period_month as IcoMetricsRow['period_month'],
    rpa_avg: bigQueryRow.rpa_avg as IcoMetricsRow['rpa_avg'],
    rpa_median: bigQueryRow.rpa_median as IcoMetricsRow['rpa_median'],
    otd_pct: bigQueryRow.otd_pct as IcoMetricsRow['otd_pct'],
    ftr_pct: bigQueryRow.ftr_pct as IcoMetricsRow['ftr_pct'],
    throughput_count: bigQueryRow.throughput_count as IcoMetricsRow['throughput_count'],
    cycle_time_avg_days: bigQueryRow.cycle_time_avg_days as IcoMetricsRow['cycle_time_avg_days'],
    pipeline_velocity: bigQueryRow.pipeline_velocity as IcoMetricsRow['pipeline_velocity'],
    stuck_asset_count: bigQueryRow.stuck_asset_count as IcoMetricsRow['stuck_asset_count'],
    stuck_asset_pct: bigQueryRow.stuck_asset_pct as IcoMetricsRow['stuck_asset_pct']
  }
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

const mapIcoMetrics = (row: IcoMetricsRow): AccountDeliveryIcoMetrics => ({
  periodYear: toNum(row.period_year),
  periodMonth: toNum(row.period_month),
  rpaAvg: toNullNum(row.rpa_avg),
  rpaMedian: toNullNum(row.rpa_median),
  otdPct: toNullNum(row.otd_pct),
  ftrPct: toNullNum(row.ftr_pct),
  throughputCount: toNum(row.throughput_count),
  cycleTimeAvg: toNullNum(row.cycle_time_avg_days),
  pipelineVelocity: toNullNum(row.pipeline_velocity),
  stuckAssetCount: toNum(row.stuck_asset_count),
  stuckAssetPct: toNullNum(row.stuck_asset_pct)
})

const previousPeriod = (year: number, month: number) => {
  if (month > 1) return { year, month: month - 1 }

  return { year: year - 1, month: 12 }
}

const sameIcoPeriod = (a: IcoMetricsRow | null, b: IcoMetricsRow | null) =>
  Boolean(
    a &&
    b &&
    toNum(a.period_year) === toNum(b.period_year) &&
    toNum(a.period_month) === toNum(b.period_month)
  )

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

  const prior = icoRow ? previousPeriod(toNum(icoRow.period_year) || year, toNum(icoRow.period_month) || month) : previousPeriod(year, month)

  const previousIcoRow = icoRow
    ? await queryIcoMetrics(scope.organizationId, prior.year, prior.month)
    : null

  const icoMetrics = icoRow ? mapIcoMetrics(icoRow) : null
  const previousIcoMetrics = previousIcoRow && !sameIcoPeriod(icoRow, previousIcoRow) ? mapIcoMetrics(previousIcoRow) : null
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
