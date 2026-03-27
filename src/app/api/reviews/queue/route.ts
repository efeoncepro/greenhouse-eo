import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'

interface ReviewRow {
  task_source_id: string
  task_name: string
  project_source_id: string
  project_name: string | null
  task_status: string
  fase_csc: string
  assignee_member_id: string | null
  assignee_name: string | null
  assignee_role: string | null
  rpa_value: number | null
  client_review_open: boolean
  open_frame_comments: number
  hours_since_update: number
  last_edited_time: string | null
  page_url: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }

  if (v && typeof v === 'object' && 'value' in v) return toNum((v as { value: unknown }).value)

  return 0
}

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectFilter = searchParams.get('projectId') || null
  const includeHistory = searchParams.get('history') === 'true'

  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()
    const projectIds = tenant.projectIds

    if (projectIds.length === 0) {
      return NextResponse.json({ pending: [], history: [], stats: { total: 0, urgent48h: 0, critical96h: 0 } })
    }

    // Pending reviews
    let pendingFilter = ''
    const params: Record<string, unknown> = { projectIds }

    if (projectFilter) {
      pendingFilter = 'AND te.project_source_id = @projectFilter'
      params.projectFilter = projectFilter
    }

    const [pendingRows] = await bigQuery.query({
      query: `
        SELECT
          te.task_source_id,
          te.task_name,
          te.project_source_id,
          dp.project_name,
          te.task_status,
          te.fase_csc,
          te.assignee_member_id,
          tm.display_name AS assignee_name,
          tm.role_title AS assignee_role,
          SAFE_CAST(te.rpa_value AS FLOAT64) AS rpa_value,
          te.client_review_open,
          COALESCE(te.open_frame_comments, 0) AS open_frame_comments,
          te.hours_since_update,
          te.last_edited_time,
          dt.page_url
        FROM \`${projectId}.ico_engine.v_tasks_enriched\` te
        LEFT JOIN \`${projectId}.greenhouse_conformed.delivery_projects\` dp
          ON dp.project_source_id = te.project_source_id AND dp.is_deleted = FALSE
        LEFT JOIN \`${projectId}.greenhouse_conformed.delivery_tasks\` dt
          ON dt.task_source_id = te.task_source_id AND dt.is_deleted = FALSE
        LEFT JOIN \`${projectId}.greenhouse.team_members\` tm
          ON tm.member_id = te.assignee_member_id
        WHERE te.project_source_id IN UNNEST(@projectIds)
          AND (te.client_review_open = TRUE OR te.fase_csc IN ('cambios_cliente', 'revision_interna'))
          AND te.task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Archivadas', 'Cancelada')
          ${pendingFilter}
        ORDER BY te.hours_since_update DESC
      `,
      params
    })

    const pending = (pendingRows as ReviewRow[]).map(r => ({
      taskId: r.task_source_id,
      taskName: r.task_name || 'Sin nombre',
      projectId: r.project_source_id,
      projectName: r.project_name || 'Proyecto',
      status: r.task_status,
      phase: r.fase_csc,
      assigneeName: r.assignee_name || null,
      assigneeRole: r.assignee_role || null,
      rpa: r.rpa_value ? toNum(r.rpa_value) : null,
      clientReviewOpen: r.client_review_open,
      openFrameComments: toNum(r.open_frame_comments),
      hoursWaiting: Math.round(toNum(r.hours_since_update)),
      daysWaiting: Math.round(toNum(r.hours_since_update) / 24),
      urgency: toNum(r.hours_since_update) >= 96 ? 'critical' : toNum(r.hours_since_update) >= 48 ? 'attention' : 'normal',
      lastEditedAt: r.last_edited_time || null,
      pageUrl: r.page_url || null
    }))

    const stats = {
      total: pending.length,
      urgent48h: pending.filter(p => p.urgency === 'attention').length,
      critical96h: pending.filter(p => p.urgency === 'critical').length
    }

    // History (last 30 days of completed reviews)
    let history: Array<Record<string, unknown>> = []

    if (includeHistory) {
      const [historyRows] = await bigQuery.query({
        query: `
          SELECT
            te.task_source_id,
            te.task_name,
            te.project_source_id,
            SAFE_CAST(te.rpa_value AS FLOAT64) AS rpa_value,
            te.completed_at
          FROM \`${projectId}.ico_engine.v_tasks_enriched\` te
          WHERE te.project_source_id IN UNNEST(@projectIds)
            AND te.task_status IN ('Listo', 'Done', 'Finalizado', 'Completado')
            AND te.completed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
          ORDER BY te.completed_at DESC
          LIMIT 20
        `,
        params: { projectIds }
      })

      history = (historyRows as Array<Record<string, unknown>>).map(r => ({
        taskId: r.task_source_id,
        taskName: r.task_name || 'Sin nombre',
        projectId: r.project_source_id,
        rpa: r.rpa_value ? toNum(r.rpa_value) : null,
        completedAt: r.completed_at
      }))
    }

    return NextResponse.json({ pending, history, stats })
  } catch (error) {
    console.error('GET /api/reviews/queue failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
