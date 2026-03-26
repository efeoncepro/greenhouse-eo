import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

interface OpsMetricsRow extends Record<string, unknown> {
  organization_id: string
  period_year: number
  period_month: number
  tasks_completed: string | number
  tasks_active: string | number
  tasks_total: string | number
  rpa_avg: string | number | null
  otd_pct: string | number | null
  ftr_pct: string | number | null
  cycle_time_avg_days: string | number | null
  throughput_count: string | number | null
  stuck_asset_count: string | number | null
  source: string
  materialized_at: string | null
}

export interface OrganizationOperationalServing {
  organizationId: string
  hasData: boolean
  source: 'postgres' | 'none'
  current: {
    periodYear: number
    periodMonth: number
    tasksCompleted: number
    tasksActive: number
    tasksTotal: number
    rpaAvg: number | null
    otdPct: number | null
    ftrPct: number | null
    cycleTimeAvgDays: number | null
    throughputCount: number | null
    stuckAssetCount: number
  } | null
  materializedAt: string | null
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

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null

  return toNum(v) || null
}

// ── Schema readiness ──

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

// ── Main function ──

export const getOrganizationOperationalServing = async (organizationId: string): Promise<OrganizationOperationalServing> => {
  await ensureOrganizationOperationalSchema()

  // Try Postgres-first: organization_operational_metrics
  const rows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT * FROM greenhouse_serving.organization_operational_metrics
     WHERE organization_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [organizationId]
  )

  if (rows.length > 0) {
    const r = rows[0]

    return {
      organizationId,
      hasData: true,
      source: 'postgres',
      current: {
        periodYear: Number(r.period_year),
        periodMonth: Number(r.period_month),
        tasksCompleted: toNum(r.tasks_completed),
        tasksActive: toNum(r.tasks_active),
        tasksTotal: toNum(r.tasks_total),
        rpaAvg: toNullNum(r.rpa_avg),
        otdPct: toNullNum(r.otd_pct),
        ftrPct: toNullNum(r.ftr_pct),
        cycleTimeAvgDays: toNullNum(r.cycle_time_avg_days),
        throughputCount: toNullNum(r.throughput_count),
        stuckAssetCount: toNum(r.stuck_asset_count)
      },
      materializedAt: r.materialized_at || null
    }
  }

  // Fallback: try ico_organization_metrics logically (the primary cache)
  const icoRows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT
      organization_id, period_year, period_month,
      COALESCE(completed_tasks, 0) AS tasks_completed,
      COALESCE(active_tasks, 0) AS tasks_active,
      COALESCE(total_tasks, 0) AS tasks_total,
      rpa_avg, otd_pct, ftr_pct,
      cycle_time_avg_days, throughput_count,
      COALESCE(stuck_asset_count, 0) AS stuck_asset_count,
      'ico_organization_metrics' AS source,
      materialized_at::text AS materialized_at
     FROM greenhouse_serving.ico_organization_metrics
     WHERE organization_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [organizationId]
  ).catch(() => [] as OpsMetricsRow[])

  if (icoRows.length > 0) {
    const r = icoRows[0]

    return {
      organizationId,
      hasData: true,
      source: 'postgres',
      current: {
        periodYear: Number(r.period_year),
        periodMonth: Number(r.period_month),
        tasksCompleted: toNum(r.tasks_completed),
        tasksActive: toNum(r.tasks_active),
        tasksTotal: toNum(r.tasks_total),
        rpaAvg: toNullNum(r.rpa_avg),
        otdPct: toNullNum(r.otd_pct),
        ftrPct: toNullNum(r.ftr_pct),
        cycleTimeAvgDays: toNullNum(r.cycle_time_avg_days),
        throughputCount: toNullNum(r.throughput_count),
        stuckAssetCount: toNum(r.stuck_asset_count)
      },
      materializedAt: r.materialized_at || null
    }
  }

  return { organizationId, hasData: false, source: 'none', current: null, materializedAt: null }
}
