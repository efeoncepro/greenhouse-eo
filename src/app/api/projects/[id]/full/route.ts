import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getProjectDetail, getProjectTasks } from '@/lib/projects/get-project-detail'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'

/**
 * Consolidated project endpoint — returns detail + tasks + ICO metrics
 * in a single call, reducing client-side fan-out from 2-3 calls to 1.
 */

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

    const scope = {
      clientId: tenant.clientId,
      projectId: projectSourceId,
      projectIds: tenant.projectIds
    }

    // Parallel fetch: detail + tasks + ICO metrics
    const [detail, tasks, icoResult] = await Promise.allSettled([
      getProjectDetail(scope),
      getProjectTasks(scope),
      (async () => {
        const pid = getBigQueryProjectId()
        const bq = getBigQueryClient()

        const [metricRows] = await bq.query({
          query: `SELECT * FROM \`${pid}.ico_engine.metrics_by_project\`
                  WHERE project_source_id = @projectSourceId
                  ORDER BY period_year DESC, period_month DESC LIMIT 1`,
          params: { projectSourceId }
        })

        const [cscRows] = await bq.query({
          query: `SELECT fase_csc, COUNT(*) AS task_count
                  FROM \`${pid}.ico_engine.v_tasks_enriched\`
                  WHERE project_source_id = @projectSourceId
                    AND task_status NOT IN ('Listo','Done','Finalizado','Completado','Archivadas','Cancelada')
                  GROUP BY fase_csc ORDER BY fase_csc`,
          params: { projectSourceId }
        })

        const m = (metricRows as Array<Record<string, unknown>>)[0]
        const csc: Record<string, number> = {}

        for (const r of cscRows as Array<{ fase_csc: string; task_count: unknown }>) {
          csc[r.fase_csc] = Number(r.task_count) || 0
        }

        return {
          hasData: !!m,
          metrics: m ? {
            rpaAvg: toNum(m.rpa_avg),
            otdPct: toNum(m.otd_pct),
            ftrPct: toNum(m.ftr_pct),
            cycleTimeAvgDays: toNum(m.cycle_time_avg_days),
            throughputCount: toNum(m.throughput_count),
            pipelineVelocity: toNum(m.pipeline_velocity),
            stuckAssetCount: toNum(m.stuck_asset_count)
          } : null,
          cscDistribution: csc
        }
      })()
    ])

    return NextResponse.json({
      detail: detail.status === 'fulfilled' ? detail.value : null,
      tasks: tasks.status === 'fulfilled' ? tasks.value : null,
      ico: icoResult.status === 'fulfilled' ? icoResult.value : null
    })
  } catch (error) {
    console.error('GET /api/projects/[id]/full failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
