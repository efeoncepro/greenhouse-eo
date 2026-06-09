import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  readOrganizationIcoMetricsFromBigQuery,
  type OrganizationIcoSourceMetricsRow
} from './organization-ico-metrics-source'

interface OpsMetricsRow extends Record<string, unknown> {
  organization_id: string
  period_year: number
  period_month: number
  tasks_completed: string | number
  tasks_active: string | number
  tasks_total: string | number
  rpa_avg: string | number | null
  rpa_median: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  throughput_count: string | number | null
  pipeline_velocity: string | number | null
  stuck_asset_count: string | number | null
  source: string
  materialized_at: string | null
}

export interface OrganizationOperationalServing {
  organizationId: string
  hasData: boolean
  source: 'postgres' | 'bigquery' | 'none'
  current: {
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
  } | null
  materializedAt: string | null
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

const resolvePeriod = (options?: { periodYear?: number; periodMonth?: number }) => {
  const now = new Date()

  return {
    year: options?.periodYear ?? now.getFullYear(),
    month: options?.periodMonth ?? (now.getMonth() + 1)
  }
}

let ensurePromise: Promise<void> | null = null

export const ensureOrganizationOperationalSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
      `
        SELECT schemaname || '.' || tablename AS qualified_name
        FROM pg_tables
        WHERE schemaname = 'greenhouse_serving'
          AND tablename = ANY($1::text[])
      `,
      [['ico_organization_metrics', 'organization_operational_metrics']]
    )

    const existing = new Set(rows.map(row => row.qualified_name))

    const required = [
      'greenhouse_serving.ico_organization_metrics',
      'greenhouse_serving.organization_operational_metrics'
    ]

    const missing = required.filter(name => !existing.has(name))

    if (missing.length > 0) {
      throw new Error(
        `Organization operational schema is not ready. Missing tables: ${missing.join(', ')}. Run pnpm setup:postgres:organization-operational first.`
      )
    }
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}

const mapOperationalRow = (
  organizationId: string,
  row: OpsMetricsRow,
  source: 'postgres' | 'bigquery'
): OrganizationOperationalServing => ({
  organizationId,
  hasData: true,
  source,
  current: {
    periodYear: Number(row.period_year),
    periodMonth: Number(row.period_month),
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
    stuckAssetCount: toNum(row.stuck_asset_count)
  },
  materializedAt: toIsoString(row.materialized_at)
})

const mapBigQueryRow = (
  organizationId: string,
  row: OrganizationIcoSourceMetricsRow
): OrganizationOperationalServing => mapOperationalRow(organizationId, {
  organization_id: String(row.organization_id),
  period_year: Number(row.period_year),
  period_month: Number(row.period_month),
  tasks_completed: row.completed_tasks as string | number,
  tasks_active: row.active_tasks as string | number,
  tasks_total: row.total_tasks as string | number,
  rpa_avg: row.rpa_avg as string | number | null,
  rpa_median: row.rpa_median as string | number | null,
  otd_pct: row.otd_pct as string | number | null,
  ftr_pct: row.ftr_pct as string | number | null,
  cycle_time_avg_days: row.cycle_time_avg_days as string | number | null,
  throughput_count: row.throughput_count as string | number | null,
  pipeline_velocity: row.pipeline_velocity as string | number | null,
  stuck_asset_count: row.stuck_asset_count as string | number | null,
  source: 'bigquery',
  materialized_at: toIsoString(row.materialized_at)
}, 'bigquery')

export const getOrganizationOperationalServing = async (
  organizationId: string,
  options?: { periodYear?: number; periodMonth?: number }
): Promise<OrganizationOperationalServing> => {
  await ensureOrganizationOperationalSchema().catch(() => {})

  const { year, month } = resolvePeriod(options)

  const rows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT
       organization_id,
       period_year,
       period_month,
       tasks_completed,
       tasks_active,
       tasks_total,
       rpa_avg,
       NULL::numeric AS rpa_median,
       otd_pct,
       ftr_pct,
       cycle_time_avg_days,
       throughput_count,
       NULL::numeric AS pipeline_velocity,
       stuck_asset_count,
       source,
       materialized_at::text AS materialized_at
     FROM greenhouse_serving.organization_operational_metrics
     WHERE organization_id = $1
       AND (period_year < $2 OR (period_year = $2 AND period_month <= $3))
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [organizationId, year, month]
  ).catch(() => [] as OpsMetricsRow[])

  if (rows.length > 0) return mapOperationalRow(organizationId, rows[0], 'postgres')

  const icoRows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT
       organization_id,
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
       COALESCE(stuck_asset_count, 0) AS stuck_asset_count,
       'ico_organization_metrics' AS source,
       materialized_at::text AS materialized_at
     FROM greenhouse_serving.ico_organization_metrics
     WHERE organization_id = $1
       AND (period_year < $2 OR (period_year = $2 AND period_month <= $3))
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [organizationId, year, month]
  ).catch(() => [] as OpsMetricsRow[])

  if (icoRows.length > 0) return mapOperationalRow(organizationId, icoRows[0], 'postgres')

  const bigQueryRow = await readOrganizationIcoMetricsFromBigQuery({
    organizationId,
    periodYear: year,
    periodMonth: month,
    mode: 'latest_at_or_before'
  }).catch(() => null)

  if (bigQueryRow) return mapBigQueryRow(organizationId, bigQueryRow)

  return { organizationId, hasData: false, source: 'none', current: null, materializedAt: null }
}
