import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : null }

  if (v && typeof v === 'object' && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const months = Math.min(12, Math.max(3, Number(searchParams.get('months') || '6')))

  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()
    const spaceId = tenant.clientId

    if (!spaceId) {
      return NextResponse.json({ error: 'No space context' }, { status: 400 })
    }

    // Trend data from ICO snapshots
    const [trendRows] = await bigQuery.query({
      query: `
        SELECT
          period_year, period_month,
          rpa_avg, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count,
          stuck_asset_count, total_tasks, completed_tasks, active_tasks
        FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
        WHERE space_id = @spaceId
        ORDER BY period_year DESC, period_month DESC
        LIMIT @months
      `,
      params: { spaceId, months }
    })

    const trend = (trendRows as Array<Record<string, unknown>>).map(r => ({
      year: Number(r.period_year),
      month: Number(r.period_month),
      rpaAvg: toNum(r.rpa_avg),
      otdPct: toNum(r.otd_pct),
      ftrPct: toNum(r.ftr_pct),
      cycleTimeAvgDays: toNum(r.cycle_time_avg_days),
      throughputCount: toNum(r.throughput_count),
      stuckAssetCount: toNum(r.stuck_asset_count),
      totalTasks: toNum(r.total_tasks),
      completedTasks: toNum(r.completed_tasks),
      activeTasks: toNum(r.active_tasks)
    })).reverse()

    // Project comparison for current period
    const [projectRows] = await bigQuery.query({
      query: `
        SELECT
          mp.project_source_id,
          dp.project_name,
          mp.rpa_avg, mp.otd_pct, mp.ftr_pct,
          mp.cycle_time_avg_days, mp.throughput_count,
          mp.stuck_asset_count, mp.total_tasks, mp.completed_tasks
        FROM \`${projectId}.ico_engine.metrics_by_project\` mp
        LEFT JOIN \`${projectId}.greenhouse_conformed.delivery_projects\` dp
          ON dp.project_source_id = mp.project_source_id AND dp.is_deleted = FALSE
        WHERE mp.space_id = @spaceId
        ORDER BY mp.period_year DESC, mp.period_month DESC, mp.total_tasks DESC
        LIMIT 20
      `,
      params: { spaceId }
    })

    const projects = (projectRows as Array<Record<string, unknown>>).map(r => ({
      projectId: String(r.project_source_id),
      projectName: String(r.project_name || 'Proyecto'),
      rpaAvg: toNum(r.rpa_avg),
      otdPct: toNum(r.otd_pct),
      ftrPct: toNum(r.ftr_pct),
      cycleTimeAvgDays: toNum(r.cycle_time_avg_days),
      throughputCount: toNum(r.throughput_count),
      stuckAssetCount: toNum(r.stuck_asset_count),
      totalTasks: toNum(r.total_tasks),
      completedTasks: toNum(r.completed_tasks)
    }))

    return NextResponse.json({ trend, projects, months })
  } catch (error) {
    console.error('GET /api/analytics/delivery failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
