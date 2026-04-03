import 'server-only'

import { NextResponse } from 'next/server'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

// ─── Error Class ────────────────────────────────────────────────────────────

export class IcoEngineError extends Error {
  statusCode: number
  details?: unknown
  code?: string

  constructor(message: string, statusCode = 400, details?: unknown, code?: string) {
    super(message)
    this.name = 'IcoEngineError'
    this.statusCode = statusCode
    this.details = details
    this.code = code
  }
}

// ─── Type Coercion ──────────────────────────────────────────────────────────

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object') {
    if (typeof (value as Record<string, unknown>).valueOf === 'function') {
      const primitive = (value as { valueOf: () => unknown }).valueOf()

      if (typeof primitive === 'number') return Number.isFinite(primitive) ? primitive : 0

      if (typeof primitive === 'string') {
        const parsed = Number(primitive)

        return Number.isFinite(parsed) ? parsed : 0
      }
    }

    if ('value' in value) return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()

  return value ? String(value).trim() : ''
}

export const toTimestampString = (value: { value?: string } | string | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return typeof value.value === 'string' ? value.value : null
}

// ─── ICO Dimension System ───────────────────────────────────────────────────

/**
 * Supported dimensions for ICO context queries.
 * Column names come from v_tasks_enriched — the allowlist prevents SQL injection.
 */
export const ICO_DIMENSIONS = {
  space:         { column: 'space_id' },
  project:       { column: 'project_source_id' },
  member:        { column: 'primary_owner_member_id' },
  client:        { column: 'client_id' },
  sprint:        { column: 'sprint_source_id' },
  business_unit: { column: 'operating_business_unit' }
} as const

export const OWNER_ATTRIBUTION_POLICY = 'primary_owner_first_assignee'

export type IcoDimensionKey = keyof typeof ICO_DIMENSIONS

export const AGENCY_REPORT_SCOPE_SPACE_IDS = [
  'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad',
  'spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9',
  'space-efeonce'
] as const

export const AGENCY_REPORT_SCOPE_CLIENT_IDS = [
  'efeonce_internal',
  'client_internal'
] as const

const AGENCY_REPORT_SCOPE_SPACE_IDS_SQL = AGENCY_REPORT_SCOPE_SPACE_IDS.map(id => `'${id}'`).join(', ')
const AGENCY_REPORT_SCOPE_CLIENT_IDS_SQL = AGENCY_REPORT_SCOPE_CLIENT_IDS.map(id => `'${id}'`).join(', ')

const normalizeAgencyScopeValue = (value: string | null | undefined) => normalizeString(value).toLowerCase()

export const isAgencyReportIncludedSpace = (context: {
  spaceId?: string | null
  clientId?: string | null
  clientName?: string | null
}): boolean => {
  const spaceId = normalizeAgencyScopeValue(context.spaceId)
  const clientId = normalizeAgencyScopeValue(context.clientId)
  const clientName = normalizeAgencyScopeValue(context.clientName)
  const combined = [spaceId, clientId, clientName].filter(Boolean).join(' ')

  if (AGENCY_REPORT_SCOPE_SPACE_IDS.includes(spaceId as (typeof AGENCY_REPORT_SCOPE_SPACE_IDS)[number])) {
    return true
  }

  if (AGENCY_REPORT_SCOPE_CLIENT_IDS.includes(clientId as (typeof AGENCY_REPORT_SCOPE_CLIENT_IDS)[number])) {
    return true
  }

  return (
    clientName === 'efeonce' ||
    clientName === 'efeonce internal' ||
    combined.includes(' sky') ||
    combined.startsWith('sky') ||
    combined.includes('sky ')
  )
}

export const buildAgencyReportScopeSql = ({
  spaceIdExpression,
  clientIdExpression,
  primaryNameExpression,
  secondaryNameExpression
}: {
  spaceIdExpression: string
  clientIdExpression: string
  primaryNameExpression?: string
  secondaryNameExpression?: string
}) => {
  const primaryName = primaryNameExpression ?? "''"
  const secondaryName = secondaryNameExpression ?? "''"

  return `(
    LOWER(TRIM(COALESCE(${spaceIdExpression}, ''))) IN (${AGENCY_REPORT_SCOPE_SPACE_IDS_SQL})
    OR LOWER(TRIM(COALESCE(${clientIdExpression}, ''))) IN (${AGENCY_REPORT_SCOPE_CLIENT_IDS_SQL})
    OR LOWER(TRIM(COALESCE(${primaryName}, ${secondaryName}, ''))) IN ('efeonce', 'efeonce internal')
    OR LOWER(TRIM(COALESCE(${primaryName}, ${secondaryName}, ${clientIdExpression}, ${spaceIdExpression}, ''))) LIKE '%sky%'
  )`
}

const DELIVERY_PERIOD_SOURCE_COLUMNS = `
  task_source_id,
  project_source_id,
  sprint_source_id,
  space_id,
  client_id,
  module_code,
  module_id,
  task_name,
  task_status,
  assignee_member_id,
  assignee_source_id,
  assignee_member_ids,
  primary_owner_source_id,
  primary_owner_member_id,
  primary_owner_type,
  has_co_assignees,
  completion_label,
  delivery_compliance,
  days_late,
  is_rescheduled,
  performance_indicator_code,
  performance_indicator_label,
  client_change_round_final,
  workflow_change_round,
  rpa_value,
  open_frame_comments,
  client_review_open,
  workflow_review_open,
  blocker_count,
  due_date,
  original_due_date,
  completed_at,
  last_edited_time,
  synced_at,
  created_at,
  period_anchor_date,
  fase_csc,
  cycle_time_days,
  hours_since_update,
  is_stuck,
  delivery_signal,
  operating_business_unit
`

export const buildDeliveryPeriodSourceSql = (projectId: string) => `(
  WITH period_snapshots AS (
    SELECT
      ${DELIVERY_PERIOD_SOURCE_COLUMNS}
    FROM \`${projectId}.ico_engine.delivery_task_monthly_snapshots\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
  ),
  preferred_snapshot_status AS (
    SELECT
      CASE
        WHEN COUNTIF(snapshot_status = 'locked') > 0 THEN 'locked'
        WHEN COUNT(*) > 0 THEN 'working'
        ELSE NULL
      END AS snapshot_status
    FROM \`${projectId}.ico_engine.delivery_task_monthly_snapshots\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
  ),
  preferred_period_snapshots AS (
    SELECT
      ${DELIVERY_PERIOD_SOURCE_COLUMNS}
    FROM \`${projectId}.ico_engine.delivery_task_monthly_snapshots\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
      AND snapshot_status = (SELECT snapshot_status FROM preferred_snapshot_status)
  )
  SELECT
    ${DELIVERY_PERIOD_SOURCE_COLUMNS}
  FROM preferred_period_snapshots
  UNION ALL
  SELECT
    ${DELIVERY_PERIOD_SOURCE_COLUMNS}
  FROM \`${projectId}.ico_engine.v_tasks_enriched\`
  WHERE NOT EXISTS (
    SELECT 1
    FROM preferred_period_snapshots
  )
    AND (${buildPeriodFilterSQL()})
)`

// ─── Canonical Status Lists ────────────────────────────────────────────────

export const DONE_STATUSES_SQL = `'Listo','Done','Finalizado','Completado','Aprobado'`
export const EXCLUDED_STATUSES_SQL = `'Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado','Tomado'`
export const PERIOD_START_SQL = 'DATE(@periodYear, @periodMonth, 1)'
export const PERIOD_END_SQL = `DATE_SUB(DATE_ADD(${PERIOD_START_SQL}, INTERVAL 1 MONTH), INTERVAL 1 DAY)`
export const REPORT_CUTOFF_DATE_SQL = `DATE_ADD(${PERIOD_END_SQL}, INTERVAL 1 DAY)`
export const PERIOD_ANCHOR_SQL = 'COALESCE(period_anchor_date, due_date, DATE(created_at), DATE(synced_at))'
export const REPORT_PERIOD_SCOPE_SQL = `(
  due_date IS NOT NULL
  AND due_date >= ${PERIOD_START_SQL}
  AND due_date <= ${PERIOD_END_SQL}
)`
export const CANONICAL_OPEN_TASK_SQL = `(
  completed_at IS NULL
  AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_STATUSES_SQL}))
)`
export const DERIVED_ON_TIME_SQL = `(
  ${REPORT_PERIOD_SCOPE_SQL}
  AND completed_at IS NOT NULL
  AND DATE(completed_at) <= due_date
)`
export const DERIVED_LATE_DROP_SQL = `(
  ${REPORT_PERIOD_SCOPE_SQL}
  AND completed_at IS NOT NULL
  AND DATE(completed_at) > due_date
)`

// Carry-Over: tasks CREATED in the period with due_date AFTER the period end.
// Represents forward-looking workload, not overdue debt.
export const CARRY_OVER_SQL = `(
  created_at IS NOT NULL
  AND DATE(created_at) >= ${PERIOD_START_SQL}
  AND DATE(created_at) <= ${PERIOD_END_SQL}
  AND due_date IS NOT NULL
  AND due_date > ${PERIOD_END_SQL}
  AND ${CANONICAL_OPEN_TASK_SQL}
)`

// Overdue: tasks with due_date IN the period that are still open at cutoff.
export const DERIVED_OVERDUE_SQL = `(
  ${REPORT_PERIOD_SCOPE_SQL}
  AND ${CANONICAL_OPEN_TASK_SQL}
)`

// Overdue Carried Forward: past-due tasks from PRIOR periods still open at cutoff.
// Represents backward-looking debt that crossed into this period unresolved.
export const OVERDUE_CARRIED_FORWARD_SQL = `(
  due_date IS NOT NULL
  AND due_date < ${PERIOD_START_SQL}
  AND ${CANONICAL_OPEN_TASK_SQL}
)`
export const CANONICAL_ON_TIME_SQL = `(
  performance_indicator_code = 'on_time'
  OR (performance_indicator_code IS NULL AND ${DERIVED_ON_TIME_SQL})
)`
export const CANONICAL_LATE_DROP_SQL = `(
  performance_indicator_code = 'late_drop'
  OR (performance_indicator_code IS NULL AND ${DERIVED_LATE_DROP_SQL})
)`
export const CANONICAL_OVERDUE_SQL = `(
  performance_indicator_code = 'overdue'
  OR (performance_indicator_code IS NULL AND ${DERIVED_OVERDUE_SQL})
)`
export const CANONICAL_CARRY_OVER_SQL = `(
  performance_indicator_code = 'carry_over'
  OR (performance_indicator_code IS NULL AND ${CARRY_OVER_SQL})
)`
export const CANONICAL_OVERDUE_CARRIED_FORWARD_SQL = `(
  performance_indicator_code = 'overdue_carried_forward'
  OR (performance_indicator_code IS NULL AND ${OVERDUE_CARRIED_FORWARD_SQL})
)`
export const CANONICAL_CLASSIFIED_TASK_SQL = `(
  ${CANONICAL_ON_TIME_SQL}
  OR ${CANONICAL_LATE_DROP_SQL}
  OR ${CANONICAL_OVERDUE_SQL}
  OR ${CANONICAL_CARRY_OVER_SQL}
  OR ${CANONICAL_OVERDUE_CARRIED_FORWARD_SQL}
)`

// OTD denominator: only tasks due THIS period (on-time + late-drop + overdue).
// Carry-Over and Overdue Carried Forward do NOT penalize OTD.
export const OTD_DENOMINATOR_SQL = `(
  ${CANONICAL_ON_TIME_SQL}
  OR ${CANONICAL_LATE_DROP_SQL}
  OR ${CANONICAL_OVERDUE_SQL}
)`
export const CANONICAL_FTR_ELIGIBLE_SQL = '(completed_at IS NOT NULL)'
export const CANONICAL_FTR_PASSED_SQL = `(
  completed_at IS NOT NULL
  AND client_change_round_final = 0
)`

// ─── Shared Metric SQL Builders ────────────────────────────────────────────

/**
 * Canonical metric SELECT expressions used by all ICO computations.
 * Defined ONCE — every materializer and live query reuses this.
 */
export const buildMetricSelectSQL = () => `
    -- RPA: average of non-zero rpa_value for completed tasks in period
    ROUND(AVG(CASE
      WHEN completed_at IS NOT NULL AND rpa_value > 0
      THEN SAFE_CAST(rpa_value AS FLOAT64)
    END), 2) AS rpa_avg,

    -- RPA median
    ROUND(APPROX_QUANTILES(
      CASE WHEN completed_at IS NOT NULL AND rpa_value > 0
      THEN SAFE_CAST(rpa_value AS FLOAT64) END, 100
    )[SAFE_OFFSET(50)], 2) AS rpa_median,

    -- OTD: on-time / (on-time + late-drop + overdue). Carry-Over and OCF excluded.
    ROUND(SAFE_DIVIDE(
      COUNTIF(${CANONICAL_ON_TIME_SQL}),
      COUNTIF(${OTD_DENOMINATOR_SQL})
    ) * 100, 1) AS otd_pct,

    -- FTR: completed tasks with zero final client change rounds.
    -- client_review_open is workflow state, not the source of truth for FTR.
    ROUND(SAFE_DIVIDE(
      COUNTIF(${CANONICAL_FTR_PASSED_SQL}),
      COUNTIF(${CANONICAL_FTR_ELIGIBLE_SQL})
    ) * 100, 1) AS ftr_pct,

    -- Cycle time avg (completed only)
    ROUND(AVG(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_avg_days,

    -- Cycle time P50
    ROUND(APPROX_QUANTILES(
      CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END, 100
    )[SAFE_OFFSET(50)], 1) AS cycle_time_p50_days,

    -- Cycle time variance (stddev)
    ROUND(STDDEV(CASE WHEN completed_at IS NOT NULL THEN cycle_time_days END), 1) AS cycle_time_variance,

    -- Throughput (completed count in report scope)
    COUNTIF(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL}) AS throughput_count,

    -- Pipeline velocity (completed / active)
    ROUND(SAFE_DIVIDE(
      COUNTIF(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL}),
      NULLIF(COUNTIF(${CANONICAL_OPEN_TASK_SQL}), 0)
    ), 2) AS pipeline_velocity,

    -- Stuck assets
    COUNTIF(is_stuck = TRUE) AS stuck_asset_count,
    ROUND(SAFE_DIVIDE(
      COUNTIF(is_stuck = TRUE),
      NULLIF(COUNTIF(${CANONICAL_OPEN_TASK_SQL}), 0)
    ) * 100, 1) AS stuck_asset_pct,

    -- Context
    COUNTIF(${CANONICAL_CLASSIFIED_TASK_SQL}) AS total_tasks,
    COUNTIF(${CANONICAL_ON_TIME_SQL} OR ${CANONICAL_LATE_DROP_SQL}) AS completed_tasks,
    COUNTIF(${CANONICAL_OVERDUE_SQL} OR ${CANONICAL_CARRY_OVER_SQL} OR ${CANONICAL_OVERDUE_CARRIED_FORWARD_SQL}) AS active_tasks,
    COUNTIF(${CANONICAL_ON_TIME_SQL}) AS on_time_count,
    COUNTIF(${CANONICAL_LATE_DROP_SQL}) AS late_drop_count,
    COUNTIF(${CANONICAL_OVERDUE_SQL}) AS overdue_count,

    -- Carry-over: tasks created in the period with due date after period end
    COUNTIF(${CANONICAL_CARRY_OVER_SQL}) AS carry_over_count,

    -- Overdue Carried Forward: past-due tasks from prior periods still open
    COUNTIF(${CANONICAL_OVERDUE_CARRIED_FORWARD_SQL}) AS overdue_carried_forward_count`

/**
 * Canonical report-period WHERE filter.
 * Uses @periodYear and @periodMonth query parameters.
 * Includes three universes:
 * 1. Tasks with due_date in period (On-Time, Late Drop, Overdue)
 * 2. Tasks created in period with future due_date (Carry-Over)
 * 3. Past-due tasks from prior periods still open (Overdue Carried Forward)
 */
export const buildPeriodFilterSQL = () => `(
    ${REPORT_PERIOD_SCOPE_SQL}
    OR (${CARRY_OVER_SQL})
    OR (${OVERDUE_CARRIED_FORWARD_SQL})
  )`

// ─── Query Runner ───────────────────────────────────────────────────────────

export const runIcoEngineQuery = async <T>(query: string, params?: Record<string, unknown>): Promise<T[]> => {
  const bigQuery = getBigQueryClient()

  const safeParams = params
    ? Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value ?? ''])
      )
    : undefined

  const [rows] = await bigQuery.query({ query, params: safeParams })

  return rows as T[]
}

export const getIcoEngineProjectId = () => getBigQueryProjectId()

// ─── Response Helpers ───────────────────────────────────────────────────────

export const toIcoEngineErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof IcoEngineError) {
    return NextResponse.json(
      { error: error.message, details: error.details ?? null },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
