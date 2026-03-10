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
    WITH scoped_tasks AS (
      SELECT
        proyecto AS notion_page_id,
        estado,
        COALESCE(CAST(rpa AS FLOAT64), 0) AS rpa_value,
        COALESCE(client_review_open, FALSE) AS client_review_open,
        COALESCE(workflow_review_open, FALSE) AS workflow_review_open,
        COALESCE(SAFE_CAST(open_frame_comments AS INT64), 0) AS open_frame_comments
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE proyecto IN UNNEST(@projectIds)
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
      t.notion_page_id,
      COALESCE(p.nombre_del_proyecto, t.notion_page_id) AS project_name,
      COALESCE(p.estado, 'Unknown') AS status,
      p.fechas AS start_date,
      p.fechas_end AS end_date,
      t.total_tasks,
      t.active_tasks,
      t.completed_tasks,
      t.avg_rpa,
      t.open_review_items,
      COALESCE(
        SAFE_CAST(REPLACE(p.pct_on_time, ' %', '') AS FLOAT64),
        ROUND(SAFE_DIVIDE(t.completed_tasks, t.total_tasks) * 100, 0)
      ) AS progress_value,
      p.page_url
    FROM task_summary t
    LEFT JOIN \`${projectId}.notion_ops.proyectos\` p
      ON p.notion_page_id = t.notion_page_id
    ORDER BY t.active_tasks DESC, t.total_tasks DESC
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
