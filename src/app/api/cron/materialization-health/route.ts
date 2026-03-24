import { NextResponse } from 'next/server'

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
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  } catch (error) {
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

  const healthy = checks.every(c => c.healthy)

  return NextResponse.json({ checks, healthy, checkedAt: new Date().toISOString() })
}
