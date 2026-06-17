import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  readOrganizationIcoMetricsFromBigQuery,
  type OrganizationIcoSourceMetricsRow
} from './organization-ico-metrics-source'

/**
 * Canonical organization operational/ICO metrics reader (TASK-1106).
 *
 * Single source of truth for "the latest operational metrics row for an organization", consumed by
 * BOTH the Account 360 delivery facet (`facets/delivery.ts`) and the executive serving helper
 * (`getOrganizationOperationalServing`). Before TASK-1106 those two duplicated a fragile UNION with
 * divergent column shapes — `facets/delivery.ts` SELECTed `rpa_median`/`pipeline_velocity`/
 * `stuck_asset_pct` from the COMPACT `organization_operational_metrics` table that never had them,
 * producing `column "rpa_median" does not exist` (42703 / ISSUE-087 / Sentry JAVASCRIPT-NEXTJS-7H).
 *
 * Resolution order (Postgres-first, BigQuery fallback per the data platform contract):
 *   1. UNION of `greenhouse_serving.organization_operational_metrics` (compact serving cache,
 *      enriched to parity in the TASK-1106 migration) ⊕ `greenhouse_serving.ico_organization_metrics`
 *      (rich mirror). Latest period at-or-before the target; the operational row wins ties.
 *   2. Canonical BigQuery source `ico_engine.metrics_by_organization` (keyed by space client_id),
 *      the actual source of truth when the PG mirrors are unpopulated.
 *
 * Honest degradation contract (CLAUDE.md "SQL Signal Reader Schema Validation Gate"):
 *   - A SCHEMA-DRIFT error (missing column / table — 42703 / 42P01) is a CONTRACT bug, not an
 *     availability blip. It is captured AND re-thrown so the Account 360 resolver records it in
 *     `_meta.errors` and the live drift guard (`account-complete-360.live.test.ts`) fails loud.
 *   - Any other PG error (connection / timeout) or an empty result degrades to the BigQuery source.
 *   - A genuinely absent metric is `null`, never a silent `0` (no catch that hides schema drift).
 */

export interface OrganizationOperationalMetricsRow {
  organizationId: string
  periodYear: number
  periodMonth: number
  tasksCompleted: number
  tasksActive: number
  tasksTotal: number
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
  pipelineVelocity: number | null
  stuckAssetCount: number
  stuckAssetPct: number | null
  source: 'postgres' | 'bigquery'
  materializedAt: string | null
}

export interface ReadOrganizationOperationalMetricsOptions {
  periodYear: number
  periodMonth: number
  mode?: 'exact' | 'latest_at_or_before'
}

interface UnifiedMetricsRow extends Record<string, unknown> {
  period_year: string | number | null
  period_month: string | number | null
  tasks_completed: string | number | null
  tasks_active: string | number | null
  tasks_total: string | number | null
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  throughput_count: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  stuck_asset_pct: string | number | null
  materialized_at: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  if (typeof v === 'object' && v !== null && 'value' in v) {
    return toNum((v as { value?: unknown }).value)
  }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = toNum(v)

  return Number.isFinite(n) ? n : null
}

const toIsoString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toIsoString((value as { value?: unknown }).value)
  }

  return null
}

const isSchemaDriftError = (err: unknown): boolean => {
  const code = (err as { code?: unknown } | null)?.code

  // 42703 = undefined_column, 42P01 = undefined_table. These mean the SQL contract drifted from the
  // real schema; surface loud instead of masking it as "no rows".
  return code === '42703' || code === '42P01'
}

const mapUnifiedRow = (
  organizationId: string,
  row: UnifiedMetricsRow,
  source: 'postgres' | 'bigquery'
): OrganizationOperationalMetricsRow => ({
  organizationId,
  periodYear: toNum(row.period_year),
  periodMonth: toNum(row.period_month),
  tasksCompleted: toNum(row.tasks_completed),
  tasksActive: toNum(row.tasks_active),
  tasksTotal: toNum(row.tasks_total),
  rpaAvg: toNullNum(row.rpa_avg),
  rpaMedian: toNullNum(row.rpa_median),
  otdPct: toNullNum(row.otd_pct),
  ftrPct: toNullNum(row.ftr_pct),
  cycleTimeAvgDays: toNullNum(row.cycle_time_avg_days),
  throughputCount: toNullNum(row.throughput_count),
  pipelineVelocity: toNullNum(row.pipeline_velocity),
  stuckAssetCount: toNum(row.stuck_asset_count),
  stuckAssetPct: toNullNum(row.stuck_asset_pct),
  source,
  materializedAt: toIsoString(row.materialized_at)
})

const mapBigQueryRow = (
  organizationId: string,
  row: OrganizationIcoSourceMetricsRow
): OrganizationOperationalMetricsRow =>
  mapUnifiedRow(
    organizationId,
    {
      period_year: row.period_year as UnifiedMetricsRow['period_year'],
      period_month: row.period_month as UnifiedMetricsRow['period_month'],
      tasks_completed: row.completed_tasks as UnifiedMetricsRow['tasks_completed'],
      tasks_active: row.active_tasks as UnifiedMetricsRow['tasks_active'],
      tasks_total: row.total_tasks as UnifiedMetricsRow['tasks_total'],
      rpa_avg: row.rpa_avg as UnifiedMetricsRow['rpa_avg'],
      rpa_median: row.rpa_median as UnifiedMetricsRow['rpa_median'],
      otd_pct: row.otd_pct as UnifiedMetricsRow['otd_pct'],
      ftr_pct: row.ftr_pct as UnifiedMetricsRow['ftr_pct'],
      cycle_time_avg_days: row.cycle_time_avg_days as UnifiedMetricsRow['cycle_time_avg_days'],
      throughput_count: row.throughput_count as UnifiedMetricsRow['throughput_count'],
      pipeline_velocity: row.pipeline_velocity as UnifiedMetricsRow['pipeline_velocity'],
      stuck_asset_count: row.stuck_asset_count as UnifiedMetricsRow['stuck_asset_count'],
      stuck_asset_pct: row.stuck_asset_pct as UnifiedMetricsRow['stuck_asset_pct'],
      materialized_at: toIsoString(row.materialized_at)
    },
    'bigquery'
  )

const buildUnionSql = (mode: 'exact' | 'latest_at_or_before'): string => {
  // `mode` is an internal enum (never user input) — safe to inline the predicate.
  const predicate =
    mode === 'exact'
      ? 'period_year = $2 AND period_month = $3'
      : '(period_year < $2 OR (period_year = $2 AND period_month <= $3))'

  return `
    WITH unified AS (
      SELECT
        period_year,
        period_month,
        tasks_completed,
        tasks_active,
        tasks_total,
        rpa_avg,
        rpa_median,
        otd_pct,
        ftr_pct,
        cycle_time_avg_days,
        throughput_count,
        pipeline_velocity,
        stuck_asset_count,
        stuck_asset_pct,
        materialized_at,
        0 AS source_rank
      FROM greenhouse_serving.organization_operational_metrics
      WHERE organization_id = $1
        AND ${predicate}

      UNION ALL

      SELECT
        period_year,
        period_month,
        COALESCE(completed_tasks, 0) AS tasks_completed,
        COALESCE(active_tasks, 0) AS tasks_active,
        COALESCE(total_tasks, 0) AS tasks_total,
        rpa_avg,
        rpa_median,
        otd_pct,
        ftr_pct,
        cycle_time_avg_days,
        throughput_count,
        pipeline_velocity,
        stuck_asset_count,
        stuck_asset_pct,
        materialized_at,
        1 AS source_rank
      FROM greenhouse_serving.ico_organization_metrics
      WHERE organization_id = $1
        AND ${predicate}
    )
    SELECT
      period_year,
      period_month,
      tasks_completed,
      tasks_active,
      tasks_total,
      rpa_avg,
      rpa_median,
      otd_pct,
      ftr_pct,
      cycle_time_avg_days,
      throughput_count,
      pipeline_velocity,
      stuck_asset_count,
      stuck_asset_pct,
      materialized_at
    FROM unified
    ORDER BY period_year DESC, period_month DESC, source_rank ASC
    LIMIT 1
  `
}

export const readOrganizationOperationalMetricsRow = async (
  organizationId: string,
  options: ReadOrganizationOperationalMetricsOptions
): Promise<OrganizationOperationalMetricsRow | null> => {
  const { periodYear, periodMonth, mode = 'latest_at_or_before' } = options

  let pgRows: UnifiedMetricsRow[] = []

  try {
    pgRows = await runGreenhousePostgresQuery<UnifiedMetricsRow>(buildUnionSql(mode), [
      organizationId,
      periodYear,
      periodMonth
    ])
  } catch (err) {
    captureWithDomain(err, 'delivery', { tags: { source: 'account360.delivery.operational_serving' } })

    // Schema drift = contract bug → surface loud (resolver records it in _meta.errors, live guard
    // fails). Availability errors degrade to the canonical BigQuery source below.
    if (isSchemaDriftError(err)) throw err

    pgRows = []
  }

  if (pgRows[0]) return mapUnifiedRow(organizationId, pgRows[0], 'postgres')

  const bigQueryRow = await readOrganizationIcoMetricsFromBigQuery({
    organizationId,
    periodYear,
    periodMonth,
    mode
  }).catch((err: unknown) => {
    captureWithDomain(err, 'delivery', { tags: { source: 'account360.delivery.operational_bigquery' } })

    return null
  })

  if (!bigQueryRow) return null

  return mapBigQueryRow(organizationId, bigQueryRow)
}
