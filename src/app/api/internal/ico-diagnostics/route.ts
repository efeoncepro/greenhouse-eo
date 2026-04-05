import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { runIcoEngineQuery, getIcoEngineProjectId } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Step 1: Infrastructure
  try {
    await ensureIcoEngineInfrastructure()
    results.infrastructure = 'OK'
  } catch (e: unknown) {
    results.infrastructure = `FAIL: ${e instanceof Error ? e.message : String(e)}`
    return NextResponse.json(results)
  }

  const projectId = getIcoEngineProjectId()

  // Step 2: Direct metric_snapshots_monthly read (no joins)
  try {
    const rows = await runIcoEngineQuery<{ cnt: string }>(`
      SELECT COUNT(*) as cnt FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
      WHERE period_year = @year AND period_month = @month
    `, { year, month })

    results.snapshotCount = rows[0]?.cnt ?? 0
  } catch (e: unknown) {
    results.snapshotCount = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Step 3: readAgencyMetrics query (subquery JOINs — fixed)
  try {
    const rows = await runIcoEngineQuery<{ space_id: string }>(`
      SELECT ms.space_id, COALESCE(c1.client_name, c2.client_name) AS client_name
      FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\` ms
      LEFT JOIN (SELECT client_id, client_name FROM \`${projectId}.greenhouse.clients\`) c1
        ON c1.client_id = ms.client_id
      LEFT JOIN (SELECT client_id, client_name FROM \`${projectId}.greenhouse.clients\`) c2
        ON c2.client_id = ms.space_id
      WHERE ms.period_year = @year AND ms.period_month = @month
      LIMIT 5
    `, { year, month })

    results.agencyMetrics = `OK: ${rows.length} rows`
  } catch (e: unknown) {
    results.agencyMetrics = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Step 4: Performance report (Postgres serving)
  try {
    const { query } = await import('@/lib/db')

    const rows = await query<{ report_scope: string }>(
      `SELECT report_scope FROM greenhouse_serving.agency_performance_reports
       WHERE period_year = $1 AND period_month = $2 LIMIT 1`,
      [year, month]
    )

    results.performanceReportServing = rows.length > 0 ? `OK: ${rows.length} rows` : 'EMPTY (will trigger BQ fallback)'
  } catch (e: unknown) {
    results.performanceReportServing = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Step 5: Performance report (BigQuery materialized)
  try {
    const rows = await runIcoEngineQuery<{ report_scope: string }>(`
      SELECT report_scope FROM \`${projectId}.${ICO_DATASET}.performance_report_monthly\`
      WHERE period_year = @year AND period_month = @month
      LIMIT 1
    `, { year, month })

    results.performanceReportBQ = rows.length > 0 ? `OK: ${rows.length} rows` : 'EMPTY (will trigger live compute fallback)'
  } catch (e: unknown) {
    results.performanceReportBQ = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Step 6: readTopPerformer isolation test (subquery JOINs — the fix)
  try {
    const { buildDeliveryPeriodSourceSql, buildMetricSelectSQL, buildAgencyReportScopeSql } = await import('@/lib/ico-engine/shared')
    const { TOP_PERFORMER_MIN_THROUGHPUT } = await import('@/lib/ico-engine/performance-report')

    const rows = await runIcoEngineQuery<{ member_id: string }>(`
      SELECT
        scoped.member_id,
        scoped.member_name,
        scoped.otd_pct,
        scoped.total_tasks AS throughput_count,
        scoped.rpa_avg,
        scoped.ftr_pct
      FROM (
        SELECT
          te.primary_owner_member_id AS member_id,
          COALESCE(tm.display_name, te.primary_owner_member_id) AS member_name,
          ${buildMetricSelectSQL()}
        FROM ${buildDeliveryPeriodSourceSql(projectId)} te
        LEFT JOIN (SELECT member_id, display_name FROM \`${projectId}.greenhouse.team_members\`) tm
          ON tm.member_id = te.primary_owner_member_id
        LEFT JOIN (SELECT client_id, client_name FROM \`${projectId}.greenhouse.clients\`) c1
          ON c1.client_id = te.client_id
        LEFT JOIN (SELECT client_id, client_name FROM \`${projectId}.greenhouse.clients\`) c2
          ON c2.client_id = te.space_id
        WHERE te.primary_owner_member_id IS NOT NULL
          AND te.primary_owner_member_id != ''
          AND ${buildAgencyReportScopeSql({
            spaceIdExpression: 'te.space_id',
            clientIdExpression: 'te.client_id',
            primaryNameExpression: 'c1.client_name',
            secondaryNameExpression: 'c2.client_name'
          })}
        GROUP BY member_id, member_name
      ) scoped
      WHERE scoped.total_tasks >= @minThroughput
        AND scoped.otd_pct IS NOT NULL
      ORDER BY scoped.otd_pct DESC, scoped.total_tasks DESC
      LIMIT 1
    `, {
      periodYear: year,
      periodMonth: month,
      minThroughput: TOP_PERFORMER_MIN_THROUGHPUT
    })

    results.topPerformerQuery = rows.length > 0 ? `OK: ${rows[0].member_id}` : 'OK: no top performer (0 rows)'
  } catch (e: unknown) {
    results.topPerformerQuery = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Step 7: Full readAgencyPerformanceReport (end-to-end)
  try {
    const { readAgencyPerformanceReport } = await import('@/lib/ico-engine/performance-report')
    const report = await readAgencyPerformanceReport(year, month)

    results.fullPerformanceReport = report ? 'OK' : 'null (no data)'
  } catch (e: unknown) {
    results.fullPerformanceReport = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({ period: `${year}-${month}`, ...results })
}
