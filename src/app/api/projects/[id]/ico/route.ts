import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { resolveIterationVelocityMetric } from '@/lib/ico-engine/iteration-velocity'

export const dynamic = 'force-dynamic'

type IterationVelocityRow = {
  completed_at: unknown
  frame_versions: unknown
  client_change_round_final: unknown
  workflow_change_round: unknown
  client_review_open: unknown
  workflow_review_open: unknown
  open_frame_comments: unknown
}

const toBool = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (value && typeof value === 'object' && 'value' in value) return toBool((value as { value: unknown }).value)

  return Boolean(value)
}

const toTimestampString = (value: unknown): string | null => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value: unknown }).value

    return typeof nested === 'string' ? nested : null
  }

  return null
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 
    return Number.isFinite(n) ? n : null
  }

  if (v && typeof v === 'object' && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

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
    const spaceId = tenant.spaceId || tenant.clientId || null

    // Get latest materialized metrics for this project
    const [metricRows, cscRows, iterationRows] = await Promise.all([
      bigQuery.query({
        query: `
          SELECT *
          FROM \`${projectId}.ico_engine.metrics_by_project\`
          WHERE project_source_id = @projectSourceId
            AND (@spaceId IS NULL OR space_id = @spaceId)
          ORDER BY period_year DESC, period_month DESC
          LIMIT 1
        `,
        params: { projectSourceId, spaceId }
      }),

      bigQuery.query({
        query: `
          SELECT
            fase_csc,
            COUNT(*) AS task_count
          FROM \`${projectId}.ico_engine.v_tasks_enriched\`
          WHERE project_source_id = @projectSourceId
            AND (@spaceId IS NULL OR space_id = @spaceId)
            AND task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Archivadas', 'Cancelada')
          GROUP BY fase_csc
          ORDER BY fase_csc
        `,
        params: { projectSourceId, spaceId }
      }),

      spaceId
        ? bigQuery.query({
            query: `
              SELECT
                completed_at,
                frame_versions,
                client_change_round_final,
                workflow_change_round,
                client_review_open,
                workflow_review_open,
                open_frame_comments
              FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
              WHERE space_id = @spaceId
                AND project_source_id = @projectSourceId
                AND is_deleted = FALSE
            `,
            params: { spaceId, projectSourceId }
          })
        : Promise.resolve([[]] as [unknown[]])
    ])

    const metrics = metricRows[0][0] as Record<string, unknown> | undefined
    const cscDistribution: Record<string, number> = {}

    for (const r of cscRows[0] as Array<{ fase_csc: string; task_count: unknown }>) {
      cscDistribution[r.fase_csc] = Number(r.task_count) || 0
    }

    const iterationVelocity = resolveIterationVelocityMetric({
      tasks: (iterationRows[0] as IterationVelocityRow[]).map(row => ({
        completedAt: toTimestampString(row.completed_at),
        frameVersions: toNum(row.frame_versions),
        clientChangeRounds: toNum(row.client_change_round_final),
        workflowChangeRounds: toNum(row.workflow_change_round),
        clientReviewOpen: toBool(row.client_review_open),
        workflowReviewOpen: toBool(row.workflow_review_open),
        openFrameComments: toNum(row.open_frame_comments)
      }))
    })

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
      iterationVelocity,
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
