import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : null }
  if (v && typeof v === 'object' && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: projectSourceId } = await params

    if (!tenant.projectIds.includes(projectSourceId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    // Get latest materialized metrics for this project
    const [metricRows] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`${projectId}.ico_engine.metrics_by_project\`
        WHERE project_source_id = @projectSourceId
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      `,
      params: { projectSourceId }
    })

    // Get CSC distribution live
    const [cscRows] = await bigQuery.query({
      query: `
        SELECT
          fase_csc,
          COUNT(*) AS task_count
        FROM \`${projectId}.ico_engine.v_tasks_enriched\`
        WHERE project_source_id = @projectSourceId
          AND task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Archivadas', 'Cancelada')
        GROUP BY fase_csc
        ORDER BY fase_csc
      `,
      params: { projectSourceId }
    })

    const metrics = metricRows[0] as Record<string, unknown> | undefined
    const cscDistribution: Record<string, number> = {}

    for (const r of cscRows as Array<{ fase_csc: string; task_count: unknown }>) {
      cscDistribution[r.fase_csc] = Number(r.task_count) || 0
    }

    return NextResponse.json({
      projectSourceId,
      hasData: !!metrics,
      metrics: metrics ? {
        rpaAvg: toNum(metrics.rpa_avg),
        otdPct: toNum(metrics.otd_pct),
        ftrPct: toNum(metrics.ftr_pct),
        cycleTimeAvgDays: toNum(metrics.cycle_time_avg_days),
        throughputCount: toNum(metrics.throughput_count),
        pipelineVelocity: toNum(metrics.pipeline_velocity),
        stuckAssetCount: toNum(metrics.stuck_asset_count),
        stuckAssetPct: toNum(metrics.stuck_asset_pct),
        totalTasks: toNum(metrics.total_tasks),
        completedTasks: toNum(metrics.completed_tasks),
        activeTasks: toNum(metrics.active_tasks)
      } : null,
      cscDistribution
    })
  } catch (error) {
    console.error('GET /api/projects/[id]/ico failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
