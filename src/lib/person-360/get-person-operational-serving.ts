import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

interface OpsMetricsRow extends Record<string, unknown> {
  member_id: string
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
  project_breakdown: unknown
  source: string
  materialized_at: string | null
}

export interface PersonOperationalServing {
  memberId: string
  hasData: boolean
  source: 'postgres' | 'bigquery_fallback' | 'none'
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
    projectBreakdown: Array<{ projectName: string; taskCount: number }>
  } | null
  materializedAt: string | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null

  return toNum(v) || null
}

// ── Schema provisioning ──

let ensurePromise: Promise<void> | null = null

export const ensurePersonOperationalSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    await runGreenhousePostgresQuery(`
      CREATE TABLE IF NOT EXISTS greenhouse_serving.person_operational_metrics (
        member_id TEXT NOT NULL,
        period_year INT NOT NULL,
        period_month INT NOT NULL,
        tasks_completed INT NOT NULL DEFAULT 0,
        tasks_active INT NOT NULL DEFAULT 0,
        tasks_total INT NOT NULL DEFAULT 0,
        rpa_avg NUMERIC(6,2),
        otd_pct NUMERIC(5,2),
        ftr_pct NUMERIC(5,2),
        cycle_time_avg_days NUMERIC(6,2),
        throughput_count INT,
        stuck_asset_count INT DEFAULT 0,
        project_breakdown JSONB DEFAULT '[]',
        source TEXT NOT NULL DEFAULT 'ico_member_metrics',
        materialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (member_id, period_year, period_month)
      )
    `)
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}

// ── Main function ──

export const getPersonOperationalServing = async (memberId: string): Promise<PersonOperationalServing> => {
  await ensurePersonOperationalSchema()

  // Try Postgres-first: person_operational_metrics
  const rows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT * FROM greenhouse_serving.person_operational_metrics
     WHERE member_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [memberId]
  )

  if (rows.length > 0) {
    const r = rows[0]
    let breakdown: Array<{ projectName: string; taskCount: number }> = []

    try {
      const raw = typeof r.project_breakdown === 'string' ? JSON.parse(r.project_breakdown) : r.project_breakdown

      if (Array.isArray(raw)) breakdown = raw
    } catch { /* ignore */ }

    return {
      memberId,
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
        stuckAssetCount: toNum(r.stuck_asset_count),
        projectBreakdown: breakdown
      },
      materializedAt: r.materialized_at || null
    }
  }

  // Fallback: try ico_member_metrics (already in Postgres from TASK-011)
  const icoRows = await runGreenhousePostgresQuery<OpsMetricsRow>(
    `SELECT
      member_id, period_year, period_month,
      COALESCE(completed_tasks, 0) AS tasks_completed,
      COALESCE(active_tasks, 0) AS tasks_active,
      COALESCE(total_tasks, 0) AS tasks_total,
      rpa_avg, otd_pct, ftr_pct,
      cycle_time_avg_days, throughput_count,
      COALESCE(stuck_asset_count, 0) AS stuck_asset_count,
      '[]'::jsonb AS project_breakdown,
      'ico_member_metrics' AS source,
      materialized_at::text AS materialized_at
     FROM greenhouse_serving.ico_member_metrics
     WHERE member_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [memberId]
  ).catch(() => [] as OpsMetricsRow[])

  if (icoRows.length > 0) {
    const r = icoRows[0]

    return {
      memberId,
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
        stuckAssetCount: toNum(r.stuck_asset_count),
        projectBreakdown: []
      },
      materializedAt: r.materialized_at || null
    }
  }

  return { memberId, hasData: false, source: 'none', current: null, materializedAt: null }
}
