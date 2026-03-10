import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

interface DashboardViewerScope {
  clientId: string
  projectIds: string[]
}

interface AggregateRow {
  project_count: number | string | null
  total_tasks: number | string | null
  active_tasks: number | string | null
  completed_tasks: number | string | null
  open_review_items: number | string | null
  avg_rpa: number | string | null
  in_progress_tasks: number | string | null
  ready_for_review_tasks: number | string | null
  client_change_tasks: number | string | null
  queued_tasks: number | string | null
  last_synced_at: { value?: string } | string | null
}

interface ProjectRow {
  notion_page_id: string | null
  project_name: string | null
  active_tasks: number | string | null
  avg_rpa: number | string | null
  progress_value: number | string | null
  page_url: string | null
}

const activeStatusLabels = ['En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados']
const completedStatusLabels = ['Listo', 'Done', 'Finalizado', 'Completado']
const queuedStatusLabels = ['Sin empezar', 'Backlog', 'Pendiente']

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

const toIsoString = (value: AggregateRow['last_synced_at']) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

const createEmptyDashboardData = (scope: DashboardViewerScope): GreenhouseDashboardData => ({
  kpis: [
    { label: 'Average RpA', value: '0.00', detail: 'No scoped projects configured yet', tone: 'success' },
    { label: 'Active tasks', value: '0', detail: 'No tasks in scope', tone: 'warning' },
    { label: 'Completed tasks', value: '0', detail: 'No finished work in scope', tone: 'info' },
    { label: 'Open review items', value: '0', detail: 'No review pressure detected', tone: 'error' }
  ],
  statusRows: [
    { label: 'In progress', value: 0, color: 'success.main' },
    { label: 'Ready for review', value: 0, color: 'warning.main' },
    { label: 'Client changes', value: 0, color: 'error.main' },
    { label: 'Queued next', value: 0, color: 'info.main' }
  ],
  projects: [],
  summary: {
    completionRate: 0
  },
  scope: {
    clientId: scope.clientId,
    projectCount: 0,
    projectIds: scope.projectIds,
    lastSyncedAt: null
  }
})

export const getDashboardOverview = async (scope: DashboardViewerScope): Promise<GreenhouseDashboardData> => {
  if (scope.projectIds.length === 0) {
    return createEmptyDashboardData(scope)
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const aggregateQuery = `
    WITH scoped_tasks AS (
      SELECT
        proyecto,
        estado,
        COALESCE(CAST(rpa AS FLOAT64), 0) AS rpa_value,
        COALESCE(client_review_open, FALSE) AS client_review_open,
        COALESCE(workflow_review_open, FALSE) AS workflow_review_open,
        COALESCE(SAFE_CAST(open_frame_comments AS INT64), 0) AS open_frame_comments,
        _synced_at
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE proyecto IN UNNEST(@projectIds)
    )
    SELECT
      COUNT(DISTINCT proyecto) AS project_count,
      COUNT(*) AS total_tasks,
      COUNTIF(estado IN UNNEST(@activeStatuses)) AS active_tasks,
      COUNTIF(estado IN UNNEST(@completedStatuses)) AS completed_tasks,
      COUNTIF(client_review_open OR workflow_review_open OR open_frame_comments > 0) AS open_review_items,
      ROUND(AVG(rpa_value), 2) AS avg_rpa,
      COUNTIF(estado = 'En curso') AS in_progress_tasks,
      COUNTIF(estado IN ('Listo para revisión', 'Listo para revision')) AS ready_for_review_tasks,
      COUNTIF(estado = 'Cambios Solicitados') AS client_change_tasks,
      COUNTIF(estado IN UNNEST(@queuedStatuses)) AS queued_tasks,
      MAX(_synced_at) AS last_synced_at
    FROM scoped_tasks
  `

  const projectWatchQuery = `
    WITH scoped_tasks AS (
      SELECT
        proyecto,
        estado,
        COALESCE(CAST(rpa AS FLOAT64), 0) AS rpa_value
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE proyecto IN UNNEST(@projectIds)
    ),
    task_summary AS (
      SELECT
        proyecto AS notion_page_id,
        COUNT(*) AS total_tasks,
        COUNTIF(estado IN UNNEST(@activeStatuses)) AS active_tasks,
        COUNTIF(estado IN UNNEST(@completedStatuses)) AS completed_tasks,
        ROUND(AVG(rpa_value), 2) AS avg_rpa
      FROM scoped_tasks
      GROUP BY proyecto
    )
    SELECT
      t.notion_page_id,
      COALESCE(p.nombre_del_proyecto, t.notion_page_id) AS project_name,
      t.active_tasks,
      t.avg_rpa,
      COALESCE(
        SAFE_CAST(REPLACE(p.pct_on_time, ' %', '') AS FLOAT64),
        ROUND(SAFE_DIVIDE(t.completed_tasks, t.total_tasks) * 100, 0)
      ) AS progress_value,
      p.page_url
    FROM task_summary t
    LEFT JOIN \`${projectId}.notion_ops.proyectos\` p
      ON p.notion_page_id = t.notion_page_id
    ORDER BY t.active_tasks DESC, t.total_tasks DESC
    LIMIT 3
  `

  const aggregateResponse = await bigQuery.query({
    query: aggregateQuery,
    params: {
      projectIds: scope.projectIds,
      activeStatuses: activeStatusLabels,
      completedStatuses: completedStatusLabels,
      queuedStatuses: queuedStatusLabels
    }
  })

  const projectResponse = await bigQuery.query({
    query: projectWatchQuery,
    params: {
      projectIds: scope.projectIds,
      activeStatuses: activeStatusLabels,
      completedStatuses: completedStatusLabels
    }
  })

  const aggregateRows = aggregateResponse[0] as AggregateRow[]
  const projectRows = projectResponse[0] as ProjectRow[]

  const aggregate = aggregateRows[0]

  if (!aggregate) {
    return createEmptyDashboardData(scope)
  }

  const projectCount = toNumber(aggregate.project_count)
  const totalTasks = toNumber(aggregate.total_tasks)
  const activeTasks = toNumber(aggregate.active_tasks)
  const completedTasks = toNumber(aggregate.completed_tasks)
  const openReviewItems = toNumber(aggregate.open_review_items)
  const avgRpa = toNumber(aggregate.avg_rpa)
  const inProgressTasks = toNumber(aggregate.in_progress_tasks)
  const readyForReviewTasks = toNumber(aggregate.ready_for_review_tasks)
  const clientChangeTasks = toNumber(aggregate.client_change_tasks)
  const queuedTasks = toNumber(aggregate.queued_tasks)
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    kpis: [
      {
        label: 'Average RpA',
        value: avgRpa.toFixed(2),
        detail: `${projectCount} projects in scope from BigQuery`,
        tone: 'success'
      },
      {
        label: 'Active tasks',
        value: String(activeTasks),
        detail: `${inProgressTasks} in progress, ${readyForReviewTasks} ready for review`,
        tone: 'warning'
      },
      {
        label: 'Completed tasks',
        value: String(completedTasks),
        detail: `${completionRate}% of scoped work is already marked done`,
        tone: 'info'
      },
      {
        label: 'Open review items',
        value: String(openReviewItems),
        detail: `${clientChangeTasks} tasks are currently in client changes`,
        tone: 'error'
      }
    ],
    statusRows: [
      { label: 'In progress', value: inProgressTasks, color: 'success.main' },
      { label: 'Ready for review', value: readyForReviewTasks, color: 'warning.main' },
      { label: 'Client changes', value: clientChangeTasks, color: 'error.main' },
      { label: 'Queued next', value: queuedTasks, color: 'info.main' }
    ],
    projects: projectRows.map(project => ({
      id: project.notion_page_id || 'unknown-project',
      name: project.project_name || project.notion_page_id || 'Unnamed project',
      activeTasks: toNumber(project.active_tasks),
      avgRpa: toNumber(project.avg_rpa),
      progress: Math.max(0, Math.min(100, Math.round(toNumber(project.progress_value)))),
      pageUrl: project.page_url
    })),
    summary: {
      completionRate
    },
    scope: {
      clientId: scope.clientId,
      projectCount,
      projectIds: scope.projectIds,
      lastSyncedAt: toIsoString(aggregate.last_synced_at)
    }
  }
}
