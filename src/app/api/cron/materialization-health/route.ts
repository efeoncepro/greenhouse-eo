import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  name: string
  source: 'bigquery' | 'postgres'
  lastMaterializedAt: string | null
  ageHours: number | null
  healthy: boolean
}

const MAX_AGE_HOURS = 48 // Consider stale after 48h

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const checks: HealthCheck[] = []

  // 1. ICO metric_snapshots_monthly (BigQuery)
  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `SELECT MAX(computed_at) AS latest
              FROM \`${projectId}.ico_engine.metric_snapshots_monthly\``
    })

    const latest = (rows[0] as { latest: { value?: string } | string | null })?.latest
    const latestStr = typeof latest === 'string' ? latest : latest?.value || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'ICO metric_snapshots_monthly',
      source: 'bigquery',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({
      name: 'ICO metric_snapshots_monthly',
      source: 'bigquery',
      lastMaterializedAt: null,
      ageHours: null,
      healthy: false
    })
  }

  // 2. ICO metrics_by_project (BigQuery)
  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `SELECT MAX(materialized_at) AS latest
              FROM \`${projectId}.ico_engine.metrics_by_project\``
    })

    const latest = (rows[0] as { latest: { value?: string } | string | null })?.latest
    const latestStr = typeof latest === 'string' ? latest : latest?.value || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'ICO metrics_by_project',
      source: 'bigquery',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({ name: 'ICO metrics_by_project', source: 'bigquery', lastMaterializedAt: null, ageHours: null, healthy: false })
  }

  // 3. ICO metrics_by_sprint (BigQuery)
  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `SELECT MAX(materialized_at) AS latest
              FROM \`${projectId}.ico_engine.metrics_by_sprint\``
    })

    const latest = (rows[0] as { latest: { value?: string } | string | null })?.latest
    const latestStr = typeof latest === 'string' ? latest : latest?.value || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'ICO metrics_by_sprint',
      source: 'bigquery',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({ name: 'ICO metrics_by_sprint', source: 'bigquery', lastMaterializedAt: null, ageHours: null, healthy: false })
  }

  // 4. ICO member metrics in Postgres
  try {
    const rows = await runGreenhousePostgresQuery<{ latest: string | null } & Record<string, unknown>>(
      `SELECT MAX(materialized_at)::text AS latest FROM greenhouse_serving.ico_member_metrics`
    )

    const latestStr = rows[0]?.latest || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'Postgres ico_member_metrics',
      source: 'postgres',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({ name: 'Postgres ico_member_metrics', source: 'postgres', lastMaterializedAt: null, ageHours: null, healthy: false })
  }

  // 5. Client economics snapshots in Postgres
  try {
    const rows = await runGreenhousePostgresQuery<{ latest: string | null } & Record<string, unknown>>(
      `SELECT MAX(computed_at)::text AS latest FROM greenhouse_finance.client_economics`
    )

    const latestStr = rows[0]?.latest || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'Postgres client_economics',
      source: 'postgres',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({ name: 'Postgres client_economics', source: 'postgres', lastMaterializedAt: null, ageHours: null, healthy: false })
  }

  // 6. Operational P&L snapshots in Postgres
  try {
    const rows = await runGreenhousePostgresQuery<{ latest: string | null } & Record<string, unknown>>(
      `SELECT MAX(materialized_at)::text AS latest FROM greenhouse_serving.operational_pl_snapshots`
    )

    const latestStr = rows[0]?.latest || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'Postgres operational_pl_snapshots',
      source: 'postgres',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({
      name: 'Postgres operational_pl_snapshots',
      source: 'postgres',
      lastMaterializedAt: null,
      ageHours: null,
      healthy: false
    })
  }

  // 7. Commercial cost attribution in Postgres
  try {
    const rows = await runGreenhousePostgresQuery<{ latest: string | null } & Record<string, unknown>>(
      `SELECT MAX(materialized_at)::text AS latest FROM greenhouse_serving.commercial_cost_attribution`
    )

    const latestStr = rows[0]?.latest || null
    const ageHours = latestStr ? Math.round((Date.now() - new Date(latestStr).getTime()) / 3_600_000) : null

    checks.push({
      name: 'Postgres commercial_cost_attribution',
      source: 'postgres',
      lastMaterializedAt: latestStr,
      ageHours,
      healthy: ageHours !== null && ageHours <= MAX_AGE_HOURS
    })
  } catch {
    checks.push({
      name: 'Postgres commercial_cost_attribution',
      source: 'postgres',
      lastMaterializedAt: null,
      ageHours: null,
      healthy: false
    })
  }

  // 8. Assignee attribution coverage in delivery_tasks (BigQuery)
  const ASSIGNEE_COVERAGE_THRESHOLD = 0.5 // Alert if <50% of completed tasks have assignee
  let assigneeCoverage: { totalCompleted: number; withAssignee: number; coveragePct: number } | null = null

  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `
        SELECT
          COUNTIF(status IN ('Listo', 'Done', 'Finalizado', 'Completado')) AS total_completed,
          COUNTIF(status IN ('Listo', 'Done', 'Finalizado', 'Completado')
            AND assignee_member_ids IS NOT NULL
            AND ARRAY_LENGTH(assignee_member_ids) > 0) AS with_assignee
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
        WHERE synced_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      `
    })

    const totalCompleted = Number((rows[0] as Record<string, unknown>)?.total_completed ?? 0)
    const withAssignee = Number((rows[0] as Record<string, unknown>)?.with_assignee ?? 0)
    const coveragePct = totalCompleted > 0 ? Math.round((withAssignee / totalCompleted) * 100) : 100

    assigneeCoverage = { totalCompleted, withAssignee, coveragePct }

    checks.push({
      name: 'Delivery assignee attribution (30d)',
      source: 'bigquery',
      lastMaterializedAt: new Date().toISOString(),
      ageHours: 0,
      healthy: coveragePct >= ASSIGNEE_COVERAGE_THRESHOLD * 100
    })
  } catch {
    checks.push({ name: 'Delivery assignee attribution (30d)', source: 'bigquery', lastMaterializedAt: null, ageHours: null, healthy: false })
  }

  const healthy = checks.every(c => c.healthy)

  return NextResponse.json({ checks, healthy, assigneeCoverage, checkedAt: new Date().toISOString() })
}
