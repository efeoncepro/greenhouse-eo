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
  // Schema check is non-blocking — on-read fallback works without materialized tables
  await ensureOrganizationOperationalSchema().catch(() => {})

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

  // Fallback 3: compute on-read from ICO space snapshots (always fresh)
  // This aggregates metric_snapshots_monthly across org's spaces.
  // Scales well for 1-20 spaces; for 50+ spaces, use materialized tables above.
  try {
    interface SpaceSnapshotRow extends Record<string, unknown> {
      period_year: number
      period_month: number
      total_rpa: string | number | null
      rpa_count: string | number
      total_otd: string | number | null
      otd_count: string | number
      total_ftr: string | number | null
      ftr_count: string | number
      avg_cycle_time: string | number | null
      sum_throughput: string | number
      sum_stuck: string | number
      sum_total_tasks: string | number
      sum_completed: string | number
      sum_active: string | number
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const spaceRows = await runGreenhousePostgresQuery<SpaceSnapshotRow>(
      `SELECT
        $2::int AS period_year,
        $3::int AS period_month,
        SUM(CASE WHEN ms.rpa_avg IS NOT NULL THEN ms.rpa_avg END) AS total_rpa,
        COUNT(CASE WHEN ms.rpa_avg IS NOT NULL THEN 1 END) AS rpa_count,
        SUM(CASE WHEN ms.otd_pct IS NOT NULL THEN ms.otd_pct END) AS total_otd,
        COUNT(CASE WHEN ms.otd_pct IS NOT NULL THEN 1 END) AS otd_count,
        SUM(CASE WHEN ms.ftr_pct IS NOT NULL THEN ms.ftr_pct END) AS total_ftr,
        COUNT(CASE WHEN ms.ftr_pct IS NOT NULL THEN 1 END) AS ftr_count,
        AVG(ms.cycle_time_avg_days) AS avg_cycle_time,
        COALESCE(SUM(ms.throughput_count), 0) AS sum_throughput,
        COALESCE(SUM(ms.stuck_asset_count), 0) AS sum_stuck,
        COALESCE(SUM(ms.total_tasks), 0) AS sum_total_tasks,
        COALESCE(SUM(ms.completed_tasks), 0) AS sum_completed,
        COALESCE(SUM(ms.active_tasks), 0) AS sum_active
      FROM greenhouse_core.spaces s
      LEFT JOIN greenhouse_serving.ico_member_metrics ms
        ON ms.member_id = s.space_id
        AND ms.period_year = $2 AND ms.period_month = $3
      WHERE s.organization_id = $1 AND s.active = TRUE
      GROUP BY 1, 2`,
      [organizationId, year, month]
    ).catch(() => [] as SpaceSnapshotRow[])

    // If no space-level ICO data, try aggregating person_operational_360 for org members
    if (spaceRows.length === 0 || toNum(spaceRows[0]?.sum_total_tasks) === 0) {
      interface PersonAggRow extends Record<string, unknown> {
        avg_rpa: string | number | null
        avg_otd: string | number | null
        avg_ftr: string | number | null
        avg_cycle_time: string | number | null
        sum_throughput: string | number
        sum_stuck: string | number
        sum_total: string | number
        sum_completed: string | number
        sum_active: string | number
      }

      const personRows = await runGreenhousePostgresQuery<PersonAggRow>(
        `SELECT
          AVG(po.rpa_avg) AS avg_rpa,
          AVG(po.otd_pct) AS avg_otd,
          AVG(po.ftr_pct) AS avg_ftr,
          AVG(po.cycle_time_avg_days) AS avg_cycle_time,
          COALESCE(SUM(po.throughput_count), 0) AS sum_throughput,
          COALESCE(SUM(po.stuck_asset_count), 0) AS sum_stuck,
          COALESCE(SUM(po.total_tasks), 0) AS sum_total,
          COALESCE(SUM(po.completed_tasks), 0) AS sum_completed,
          COALESCE(SUM(po.active_tasks), 0) AS sum_active
        FROM greenhouse_serving.person_operational_360 po
        JOIN greenhouse_core.client_team_assignments a ON a.member_id = po.member_id AND a.active = TRUE
        JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.organization_id = $1
        WHERE po.period_year = $2 AND po.period_month = $3`,
        [organizationId, year, month]
      ).catch(() => [] as PersonAggRow[])

      if (personRows.length > 0 && toNum(personRows[0]?.sum_total) > 0) {
        const p = personRows[0]

        return {
          organizationId,
          hasData: true,
          source: 'postgres' as const,
          current: {
            periodYear: year,
            periodMonth: month,
            tasksCompleted: toNum(p.sum_completed),
            tasksActive: toNum(p.sum_active),
            tasksTotal: toNum(p.sum_total),
            rpaAvg: toNullNum(p.avg_rpa),
            otdPct: toNullNum(p.avg_otd),
            ftrPct: toNullNum(p.avg_ftr),
            cycleTimeAvgDays: toNullNum(p.avg_cycle_time),
            throughputCount: toNullNum(p.sum_throughput),
            stuckAssetCount: toNum(p.sum_stuck)
          },
          materializedAt: new Date().toISOString()
        }
      }
    }

    if (spaceRows.length > 0 && toNum(spaceRows[0]?.sum_total_tasks) > 0) {
      const s = spaceRows[0]
      const rpaCount = toNum(s.rpa_count)
      const otdCount = toNum(s.otd_count)
      const ftrCount = toNum(s.ftr_count)

      return {
        organizationId,
        hasData: true,
        source: 'postgres' as const,
        current: {
          periodYear: year,
          periodMonth: month,
          tasksCompleted: toNum(s.sum_completed),
          tasksActive: toNum(s.sum_active),
          tasksTotal: toNum(s.sum_total_tasks),
          rpaAvg: rpaCount > 0 ? Math.round((toNum(s.total_rpa) / rpaCount) * 100) / 100 : null,
          otdPct: otdCount > 0 ? Math.round((toNum(s.total_otd) / otdCount) * 10) / 10 : null,
          ftrPct: ftrCount > 0 ? Math.round((toNum(s.total_ftr) / ftrCount) * 10) / 10 : null,
          cycleTimeAvgDays: toNullNum(s.avg_cycle_time),
          throughputCount: toNullNum(s.sum_throughput),
          stuckAssetCount: toNum(s.sum_stuck)
        },
        materializedAt: new Date().toISOString()
      }
    }
  } catch {
    // On-read compute failed — non-blocking
  }

  return { organizationId, hasData: false, source: 'none', current: null, materializedAt: null }
}
