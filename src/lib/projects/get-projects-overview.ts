import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { GreenhouseProjectsData, GreenhouseProjectListItem, GreenhouseProjectReviewLoad, GreenhouseProjectStatusTone } from '@/types/greenhouse-projects'

interface ProjectViewerScope {
  clientId: string
  projectIds: string[]
}

interface ProjectRow {
  notion_page_id: string | null
  project_name: string | null
  status: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  total_tasks: number | string | null
  active_tasks: number | string | null
  completed_tasks: number | string | null
  avg_rpa: number | string | null
  open_review_items: number | string | null
  progress_value: number | string | null
  page_url: string | null
}

const activeStatuses = ['En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados']
const completedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toDateString = (value: ProjectRow['start_date']) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

const getStatusTone = (status: string): GreenhouseProjectStatusTone => {
  const normalized = status.toLowerCase()

  if (normalized.includes('riesgo') || normalized.includes('cambio') || normalized.includes('bloque')) {
    return 'error'
  }

  if (normalized.includes('curso') || normalized.includes('trabajo')) {
    return 'warning'
  }

  if (normalized.includes('revisi')) {
    return 'info'
  }

  if (normalized.includes('listo')) {
    return 'success'
  }

  return 'default'
}

const getReviewLoad = (openReviewItems: number): GreenhouseProjectReviewLoad => {
  if (openReviewItems >= 5) {
    return 'High'
  }

  if (openReviewItems >= 1) {
    return 'Medium'
  }

  return 'Low'
}

const createEmptyProjectsData = (scope: ProjectViewerScope): GreenhouseProjectsData => ({
  items: [],
  scope: {
    clientId: scope.clientId,
    projectCount: 0,
    projectIds: scope.projectIds
  }
})

export const getProjectsOverview = async (scope: ProjectViewerScope): Promise<GreenhouseProjectsData> => {
  if (scope.projectIds.length === 0) {
    return createEmptyProjectsData(scope)
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const query = `
    WITH projects AS (
      SELECT *
      FROM \`${projectId}.greenhouse_conformed.delivery_projects\`
      WHERE project_source_id IN UNNEST(@projectIds)
        AND is_deleted = FALSE
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY project_source_id
        ORDER BY last_edited_time DESC NULLS LAST, synced_at DESC NULLS LAST, project_source_id
      ) = 1
    ),
    scoped_tasks AS (
      SELECT
        dt.project_source_id AS notion_page_id,
        dt.task_status AS estado,
        COALESCE(SAFE_CAST(dt.rpa_value AS FLOAT64), 0) AS rpa_value,
        COALESCE(dt.client_review_open, FALSE) AS client_review_open,
        COALESCE(dt.workflow_review_open, FALSE) AS workflow_review_open,
        COALESCE(dt.open_frame_comments, 0) AS open_frame_comments
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` dt
      WHERE dt.project_source_id IN UNNEST(@projectIds)
        AND dt.is_deleted = FALSE
    ),
    task_summary AS (
      SELECT
        notion_page_id,
        COUNT(*) AS total_tasks,
        COUNTIF(estado IN UNNEST(@activeStatuses)) AS active_tasks,
        COUNTIF(estado IN UNNEST(@completedStatuses)) AS completed_tasks,
        ROUND(AVG(rpa_value), 2) AS avg_rpa,
        COUNTIF(client_review_open OR workflow_review_open OR open_frame_comments > 0) AS open_review_items
      FROM scoped_tasks
      GROUP BY notion_page_id
    )
    SELECT
      COALESCE(p.project_source_id, t.notion_page_id) AS notion_page_id,
      COALESCE(p.project_name, t.notion_page_id) AS project_name,
      COALESCE(p.project_status, 'Unknown') AS status,
      p.start_date,
      p.end_date,
      COALESCE(t.total_tasks, 0) AS total_tasks,
      COALESCE(t.active_tasks, 0) AS active_tasks,
      COALESCE(t.completed_tasks, 0) AS completed_tasks,
      t.avg_rpa,
      COALESCE(t.open_review_items, 0) AS open_review_items,
      ROUND(SAFE_DIVIDE(COALESCE(t.completed_tasks, 0), NULLIF(COALESCE(t.total_tasks, 0), 0)) * 100, 0) AS progress_value,
      p.page_url
    FROM projects p
    LEFT JOIN task_summary t
      ON t.notion_page_id = p.project_source_id
    ORDER BY COALESCE(t.active_tasks, 0) DESC, COALESCE(t.total_tasks, 0) DESC
  `

  const response = await bigQuery.query({
    query,
    params: {
      projectIds: scope.projectIds,
      activeStatuses,
      completedStatuses
    }
  })

  const rows = response[0] as ProjectRow[]

  const items: GreenhouseProjectListItem[] = rows.map(row => {
    const openReviewItems = toNumber(row.open_review_items)
    const progress = Math.max(0, Math.min(100, Math.round(toNumber(row.progress_value))))
    const status = row.status || 'Unknown'

    return {
      id: row.notion_page_id || 'unknown-project',
      name: row.project_name || row.notion_page_id || 'Unnamed project',
      status,
      statusTone: getStatusTone(status),
      totalTasks: toNumber(row.total_tasks),
      activeTasks: toNumber(row.active_tasks),
      completedTasks: toNumber(row.completed_tasks),
      progress,
      avgRpa: toNumber(row.avg_rpa),
      openReviewItems,
      reviewLoad: getReviewLoad(openReviewItems),
      startDate: toDateString(row.start_date),
      endDate: toDateString(row.end_date),
      pageUrl: row.page_url
    }
  })

  return {
    items,
    scope: {
      clientId: scope.clientId,
      projectCount: items.length,
      projectIds: scope.projectIds
    }
  }
}
