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

// ─── Canonical Status Lists ────────────────────────────────────────────────

export const DONE_STATUSES_SQL = `'Listo','Done','Finalizado','Completado','Aprobado'`
export const EXCLUDED_STATUSES_SQL = `'Listo','Done','Finalizado','Completado','Aprobado','Archivadas','Archivada','Cancelada','Canceled','Cancelled','Archivado'`
export const PERIOD_START_SQL = 'DATE(@periodYear, @periodMonth, 1)'
export const PERIOD_END_SQL = `DATE_SUB(DATE_ADD(${PERIOD_START_SQL}, INTERVAL 1 MONTH), INTERVAL 1 DAY)`
export const PERIOD_ANCHOR_SQL = 'COALESCE(period_anchor_date, due_date, DATE(created_at), DATE(synced_at))'
export const DERIVED_ON_TIME_SQL = `(
  completed_at IS NOT NULL
  AND due_date IS NOT NULL
  AND DATE(completed_at) <= due_date
)`
export const DERIVED_LATE_DROP_SQL = `(
  completed_at IS NOT NULL
  AND due_date IS NOT NULL
  AND DATE(completed_at) > due_date
)`
export const CARRY_OVER_SQL = `(
  ${PERIOD_ANCHOR_SQL} IS NOT NULL
  AND ${PERIOD_ANCHOR_SQL} < ${PERIOD_START_SQL}
  AND completed_at IS NULL
  AND task_status NOT IN (${EXCLUDED_STATUSES_SQL})
)`
export const DERIVED_OVERDUE_SQL = `(
  due_date IS NOT NULL
  AND due_date <= ${PERIOD_END_SQL}
  AND completed_at IS NULL
  AND task_status NOT IN (${EXCLUDED_STATUSES_SQL})
)`
export const CANONICAL_ON_TIME_SQL = `(
  performance_indicator_code = 'on_time'
  OR (performance_indicator_code IS NULL AND ${DERIVED_ON_TIME_SQL})
)`
export const CANONICAL_LATE_DROP_SQL = `(
  performance_indicator_code = 'late_drop'
  OR (performance_indicator_code IS NULL AND ${DERIVED_LATE_DROP_SQL})
)`
export const CANONICAL_OVERDUE_SQL = DERIVED_OVERDUE_SQL
export const CANONICAL_CARRY_OVER_SQL = CARRY_OVER_SQL
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

    -- OTD: on-time / (on-time + late)
    ROUND(SAFE_DIVIDE(
      COUNTIF(${CANONICAL_ON_TIME_SQL}),
      COUNTIF(${CANONICAL_ON_TIME_SQL}) + COUNTIF(${CANONICAL_LATE_DROP_SQL})
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

    -- Throughput (completed count)
    COUNTIF(completed_at IS NOT NULL) AS throughput_count,

    -- Pipeline velocity (completed / active)
    ROUND(SAFE_DIVIDE(
      COUNTIF(completed_at IS NOT NULL),
      COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES_SQL}))
    ), 2) AS pipeline_velocity,

    -- Stuck assets
    COUNTIF(is_stuck = TRUE) AS stuck_asset_count,
    ROUND(SAFE_DIVIDE(
      COUNTIF(is_stuck = TRUE),
      COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES_SQL}))
    ) * 100, 1) AS stuck_asset_pct,

    -- Context
    COUNT(*) AS total_tasks,
    COUNTIF(completed_at IS NOT NULL) AS completed_tasks,
    COUNTIF(task_status NOT IN (${EXCLUDED_STATUSES_SQL})) AS active_tasks,
    COUNTIF(${CANONICAL_ON_TIME_SQL}) AS on_time_count,
    COUNTIF(${CANONICAL_LATE_DROP_SQL}) AS late_drop_count,
    COUNTIF(${CANONICAL_OVERDUE_SQL}) AS overdue_count,

    -- Carry-over count (tasks anchored in a previous period and still active)
    COUNTIF(${CANONICAL_CARRY_OVER_SQL}) AS carry_over_count`

/**
 * Canonical period + active tasks WHERE filter.
 * Uses @periodYear and @periodMonth query parameters.
 */
export const buildPeriodFilterSQL = () => `
    (
      ${PERIOD_ANCHOR_SQL} IS NOT NULL
      AND EXTRACT(YEAR FROM ${PERIOD_ANCHOR_SQL}) = @periodYear
      AND EXTRACT(MONTH FROM ${PERIOD_ANCHOR_SQL}) = @periodMonth
    )
    OR ${CARRY_OVER_SQL}`

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
