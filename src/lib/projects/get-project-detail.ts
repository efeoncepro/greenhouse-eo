import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type {
  GreenhouseProjectDetailData,
  GreenhouseProjectSprintContext,
  GreenhouseProjectTasksData
} from '@/types/greenhouse-project-detail'
import type { GreenhouseProjectReviewLoad, GreenhouseProjectStatusTone } from '@/types/greenhouse-projects'

interface ProjectDetailScope {
  clientId: string
  projectId: string
  projectIds: string[]
}

interface ProjectSummaryRow {
  notion_page_id: string | null
  project_name: string | null
  status: string | null
  summary: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  total_tasks: number | string | null
  active_tasks: number | string | null
  completed_tasks: number | string | null
  avg_rpa: number | string | null
  open_review_items: number | string | null
  ready_for_review_tasks: number | string | null
  client_change_tasks: number | string | null
  blocked_tasks: number | string | null
  progress_value: number | string | null
  page_url: string | null
}

interface SprintRow {
  notion_page_id: string | null
  sprint_name: string | null
  status: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  total_tasks: number | string | null
  completed_tasks: number | string | null
  page_url: string | null
}

interface TaskRow {
  notion_page_id: string | null
  task_name: string | null
  status: string | null
  rpa_value: number | string | null
  rpa_semaphore_source: string | null
  performance_indicator_label: string | null
  completion_label: string | null
  delivery_compliance: string | null
  days_late: number | string | null
  rescheduled_days: number | string | null
  is_rescheduled: boolean | null
  client_change_round_label: string | null
  client_change_round_final: number | string | null
  workflow_change_round: number | string | null
  frame_versions: number | string | null
  frame_comments: number | string | null
  open_frame_comments: number | string | null
  client_review_open: boolean | null
  workflow_review_open: boolean | null
  blocker_count: number | string | null
  original_due_date: { value?: string } | string | null
  execution_time_label: string | null
  changes_time_label: string | null
  review_time_label: string | null
  sprint_name: string | null
  last_frame_comment: string | null
  last_edited_time: { value?: string } | string | null
  page_url: string | null
}

const activeStatuses = ['En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados']
const completedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const readyForReviewStatuses = ['Listo para revisión', 'Listo para revision']
const blockedStatuses = ['Bloqueado', 'Detenido']

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

const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const normalizePerformanceIndicatorCode = (value: string | null) => {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (!normalized || normalized === '—' || normalized === '-') {
    return null
  }

  if (normalized.includes('on-time') || normalized.includes('on time')) return 'on_time'
  if (normalized.includes('late drop')) return 'late_drop'
  if (normalized.includes('overdue')) return 'overdue'
  if (normalized.includes('carry-over') || normalized.includes('carry over')) return 'carry_over'

  return null
}

const getDerivedRpaSemaphore = (value: number | null): 'green' | 'yellow' | 'red' | 'default' => {
  if (value === null || value === 0) return 'default'
  if (value <= 1.5) return 'green'
  if (value <= 2.5) return 'yellow'

  return 'red'
}

const getStatusTone = (status: string): GreenhouseProjectStatusTone => {
  const normalized = status.toLowerCase()

  if (normalized.includes('riesgo') || normalized.includes('cambio') || normalized.includes('bloque') || normalized.includes('detenido')) {
    return 'error'
  }

  if (normalized.includes('curso') || normalized.includes('trabajo')) {
    return 'warning'
  }

  if (normalized.includes('revisi')) {
    return 'info'
  }

  if (normalized.includes('listo') || normalized.includes('complet')) {
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

export const isProjectInTenantScope = (projectIds: string[], projectId: string) => projectIds.includes(projectId)

const getSprintContext = async (scope: ProjectDetailScope): Promise<GreenhouseProjectSprintContext | null> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const query = `
    WITH delivery_sprints AS (
      SELECT *
      FROM \`${projectId}.greenhouse_conformed.delivery_sprints\`
      WHERE project_source_id = @projectDetailId
        AND is_deleted = FALSE
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY sprint_source_id
        ORDER BY last_edited_time DESC NULLS LAST, synced_at DESC NULLS LAST, sprint_source_id
      ) = 1
    ),
    project_sprints AS (
      SELECT
        sprint_id,
        COUNT(*) AS total_tasks,
        COUNTIF(estado IN UNNEST(@completedStatuses)) AS completed_tasks
      FROM \`${projectId}.notion_ops.tareas\`,
      UNNEST(IFNULL(sprint_ids, ARRAY<STRING>[])) AS sprint_id
      WHERE proyecto = @projectDetailId
      GROUP BY sprint_id
    )
    SELECT
      COALESCE(ds.sprint_source_id, s.notion_page_id) AS notion_page_id,
      COALESCE(ds.sprint_name, s.nombre_del_sprint) AS sprint_name,
      COALESCE(ds.sprint_status, s.estado_del_sprint) AS status,
      COALESCE(ds.start_date, s.fechas) AS start_date,
      COALESCE(ds.end_date, s.fechas_end) AS end_date,
      COALESCE(project_sprints.total_tasks, SAFE_CAST(s.total_de_tareas AS INT64), 0) AS total_tasks,
      COALESCE(
        project_sprints.completed_tasks,
        CAST(ROUND(SAFE_CAST(s.tareas_completadas AS FLOAT64) * SAFE_CAST(s.total_de_tareas AS FLOAT64), 0) AS INT64),
        0
      ) AS completed_tasks,
      s.page_url
    FROM project_sprints
    LEFT JOIN delivery_sprints ds
      ON ds.sprint_source_id = project_sprints.sprint_id
    LEFT JOIN \`${projectId}.notion_ops.sprints\` s
      ON s.notion_page_id = project_sprints.sprint_id
    ORDER BY
      CASE COALESCE(ds.sprint_status, s.estado_del_sprint)
        WHEN 'Actual' THEN 0
        WHEN 'Siguiente' THEN 1
        WHEN 'Último' THEN 2
        ELSE 3
      END,
      COALESCE(ds.last_edited_time, s.last_edited_time) DESC
    LIMIT 1
  `

  const [rows] = await bigQuery.query({
    query,
    params: {
      projectDetailId: scope.projectId,
      completedStatuses
    }
  })

  const sprint = (rows[0] as SprintRow | undefined) || null

  if (!sprint?.notion_page_id) {
    return null
  }

  const totalTasks = toNumber(sprint.total_tasks)
  const completedTasks = Math.min(totalTasks, toNumber(sprint.completed_tasks))

  return {
    id: sprint.notion_page_id,
    name: sprint.sprint_name || sprint.notion_page_id,
    status: sprint.status || 'Unknown',
    startDate: toDateString(sprint.start_date),
    endDate: toDateString(sprint.end_date),
    totalTasks,
    completedTasks,
    progress: totalTasks > 0 ? clampPercentage((completedTasks / totalTasks) * 100) : 0,
    pageUrl: sprint.page_url
  }
}

export const getProjectDetail = async (scope: ProjectDetailScope): Promise<GreenhouseProjectDetailData | null> => {
  if (!isProjectInTenantScope(scope.projectIds, scope.projectId)) {
    return null
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const query = `
    WITH delivery_projects AS (
      SELECT *
      FROM \`${projectId}.greenhouse_conformed.delivery_projects\`
      WHERE project_source_id = @projectDetailId
        AND is_deleted = FALSE
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY project_source_id
        ORDER BY last_edited_time DESC NULLS LAST, synced_at DESC NULLS LAST, project_source_id
      ) = 1
    ),
    requested_project AS (
      SELECT @projectDetailId AS notion_page_id
    ),
    scoped_tasks AS (
      SELECT
        estado,
        COALESCE(CAST(rpa AS FLOAT64), 0) AS rpa_value,
        COALESCE(client_review_open, FALSE) AS client_review_open,
        COALESCE(workflow_review_open, FALSE) AS workflow_review_open,
        COALESCE(SAFE_CAST(open_frame_comments AS INT64), 0) AS open_frame_comments,
        COALESCE(ARRAY_LENGTH(bloqueado_por_ids), 0) AS blocker_count
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE proyecto = @projectDetailId
    ),
    task_summary AS (
      SELECT
        @projectDetailId AS notion_page_id,
        COUNT(*) AS total_tasks,
        COUNTIF(estado IN UNNEST(@activeStatuses)) AS active_tasks,
        COUNTIF(estado IN UNNEST(@completedStatuses)) AS completed_tasks,
        ROUND(AVG(rpa_value), 2) AS avg_rpa,
        COUNTIF(client_review_open OR workflow_review_open OR open_frame_comments > 0) AS open_review_items,
        COUNTIF(estado IN UNNEST(@readyForReviewStatuses)) AS ready_for_review_tasks,
        COUNTIF(estado = 'Cambios Solicitados') AS client_change_tasks,
        COUNTIF(blocker_count > 0 OR estado IN UNNEST(@blockedStatuses)) AS blocked_tasks
      FROM scoped_tasks
    )
    SELECT
      requested_project.notion_page_id,
      COALESCE(dp.project_name, p.nombre_del_proyecto, requested_project.notion_page_id) AS project_name,
      COALESCE(dp.project_status, p.estado, 'Unknown') AS status,
      p.resumen AS summary,
      COALESCE(dp.start_date, p.fechas) AS start_date,
      COALESCE(dp.end_date, p.fechas_end) AS end_date,
      COALESCE(task_summary.total_tasks, 0) AS total_tasks,
      COALESCE(task_summary.active_tasks, 0) AS active_tasks,
      COALESCE(task_summary.completed_tasks, 0) AS completed_tasks,
      COALESCE(task_summary.avg_rpa, 0) AS avg_rpa,
      COALESCE(task_summary.open_review_items, 0) AS open_review_items,
      COALESCE(task_summary.ready_for_review_tasks, 0) AS ready_for_review_tasks,
      COALESCE(task_summary.client_change_tasks, 0) AS client_change_tasks,
      COALESCE(task_summary.blocked_tasks, 0) AS blocked_tasks,
      COALESCE(
        SAFE_CAST(REPLACE(p.pct_on_time, ' %', '') AS FLOAT64),
        ROUND(SAFE_DIVIDE(COALESCE(task_summary.completed_tasks, 0), COALESCE(task_summary.total_tasks, 0)) * 100, 0),
        0
      ) AS progress_value,
      p.page_url
    FROM requested_project
    LEFT JOIN delivery_projects dp
      ON dp.project_source_id = requested_project.notion_page_id
    LEFT JOIN \`${projectId}.notion_ops.proyectos\` p
      ON p.notion_page_id = requested_project.notion_page_id
    LEFT JOIN task_summary
      ON task_summary.notion_page_id = requested_project.notion_page_id
  `

  const [rows] = await bigQuery.query({
    query,
    params: {
      projectDetailId: scope.projectId,
      activeStatuses,
      completedStatuses,
      readyForReviewStatuses,
      blockedStatuses
    }
  })

  const row = (rows[0] as ProjectSummaryRow | undefined) || null

  if (!row?.notion_page_id) {
    return null
  }

  const openReviewItems = toNumber(row.open_review_items)
  const blockedTasks = toNumber(row.blocked_tasks)
  const sprint = await getSprintContext(scope)

  return {
    project: {
      id: row.notion_page_id,
      name: row.project_name || row.notion_page_id,
      status: row.status || 'Unknown',
      statusTone: getStatusTone(row.status || 'Unknown'),
      summary: row.summary,
      startDate: toDateString(row.start_date),
      endDate: toDateString(row.end_date),
      pageUrl: row.page_url,
      totalTasks: toNumber(row.total_tasks),
      activeTasks: toNumber(row.active_tasks),
      completedTasks: toNumber(row.completed_tasks),
      progress: clampPercentage(toNumber(row.progress_value)),
      avgRpa: toNumber(row.avg_rpa),
      openReviewItems,
      blockedTasks,
      reviewLoad: getReviewLoad(openReviewItems)
    },
    sprint,
    reviewPressure: {
      tasksWithOpenReviews: openReviewItems,
      tasksReadyForReview: toNumber(row.ready_for_review_tasks),
      tasksInClientChanges: toNumber(row.client_change_tasks),
      tasksBlocked: blockedTasks
    },
    scope: {
      clientId: scope.clientId,
      projectId: scope.projectId
    }
  }
}

export const getProjectTasks = async (scope: ProjectDetailScope): Promise<GreenhouseProjectTasksData | null> => {
  if (!isProjectInTenantScope(scope.projectIds, scope.projectId)) {
    return null
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const query = `
    SELECT
      notion_page_id,
      nombre_de_tarea AS task_name,
      estado AS status,
      COALESCE(CAST(rpa AS FLOAT64), 0) AS rpa_value,
      \`semáforo_rpa\` AS rpa_semaphore_source,
      indicador_de_performance AS performance_indicator_label,
      completitud AS completion_label,
      cumplimiento AS delivery_compliance,
      SAFE_CAST(\`días_de_retraso\` AS INT64) AS days_late,
      SAFE_CAST(\`días_reprogramados\` AS INT64) AS rescheduled_days,
      CASE LOWER(COALESCE(reprogramada, ''))
        WHEN 'sí' THEN TRUE
        WHEN 'si' THEN TRUE
        WHEN 'yes' THEN TRUE
        WHEN 'true' THEN TRUE
        ELSE FALSE
      END AS is_rescheduled,
      client_change_round AS client_change_round_label,
      SAFE_CAST(client_change_round_final AS INT64) AS client_change_round_final,
      SAFE_CAST(workflow_change_round AS INT64) AS workflow_change_round,
      COALESCE(SAFE_CAST(frame_versions AS INT64), 0) AS frame_versions,
      COALESCE(SAFE_CAST(frame_comments AS INT64), 0) AS frame_comments,
      COALESCE(SAFE_CAST(open_frame_comments AS INT64), 0) AS open_frame_comments,
      COALESCE(client_review_open, FALSE) AS client_review_open,
      COALESCE(workflow_review_open, FALSE) AS workflow_review_open,
      COALESCE(ARRAY_LENGTH(bloqueado_por_ids), 0) AS blocker_count,
      COALESCE(\`fecha_límite_original_end\`, \`fecha_límite_original\`) AS original_due_date,
      \`tiempo_de_ejecución\` AS execution_time_label,
      \`tiempo_en_cambios\` AS changes_time_label,
      \`tiempo_en_revisión\` AS review_time_label,
      sprint AS sprint_name,
      last_frame_comment,
      last_edited_time,
      page_url
    FROM \`${projectId}.notion_ops.tareas\`
    WHERE proyecto = @projectDetailId
    ORDER BY last_edited_time DESC, created_time DESC
  `

  const [rows] = await bigQuery.query({
    query,
    params: {
      projectDetailId: scope.projectId
    }
  })

  const items = (rows as TaskRow[]).map(row => {
    const openFrameComments = toNumber(row.open_frame_comments)
    const reviewOpen = Boolean(row.client_review_open || row.workflow_review_open || openFrameComments > 0)
    const blocked = toNumber(row.blocker_count) > 0 || blockedStatuses.includes(row.status || '')

    return {
      id: row.notion_page_id || 'unknown-task',
      name: row.task_name || row.notion_page_id || 'Unnamed task',
      status: row.status || 'Unknown',
      statusTone: getStatusTone(row.status || 'Unknown'),
      rpa: toNumber(row.rpa_value),
      rpaSemaphoreSource: row.rpa_semaphore_source,
      rpaSemaphoreDerived: getDerivedRpaSemaphore(toNumber(row.rpa_value)),
      performanceIndicatorLabel: row.performance_indicator_label,
      performanceIndicatorCode: normalizePerformanceIndicatorCode(row.performance_indicator_label),
      deliveryCompliance: row.delivery_compliance,
      completionLabel: row.completion_label,
      daysLate: row.days_late === null || row.days_late === undefined ? null : toNumber(row.days_late),
      rescheduledDays: row.rescheduled_days === null || row.rescheduled_days === undefined ? null : toNumber(row.rescheduled_days),
      isRescheduled: Boolean(row.is_rescheduled),
      clientChangeRoundLabel: row.client_change_round_label,
      clientChangeRoundFinal:
        row.client_change_round_final === null || row.client_change_round_final === undefined
          ? null
          : toNumber(row.client_change_round_final),
      workflowChangeRound:
        row.workflow_change_round === null || row.workflow_change_round === undefined
          ? null
          : toNumber(row.workflow_change_round),
      frameVersions: toNumber(row.frame_versions),
      frameComments: toNumber(row.frame_comments),
      openFrameComments,
      reviewOpen,
      blocked,
      originalDueDate: toDateString(row.original_due_date),
      executionTimeLabel: row.execution_time_label,
      changesTimeLabel: row.changes_time_label,
      reviewTimeLabel: row.review_time_label,
      sprintName: row.sprint_name,
      lastFrameComment: row.last_frame_comment,
      lastEditedAt: toDateString(row.last_edited_time),
      pageUrl: row.page_url
    }
  })

  return {
    items,
    meta: {
      projectId: scope.projectId,
      totalTasks: items.length
    }
  }
}
