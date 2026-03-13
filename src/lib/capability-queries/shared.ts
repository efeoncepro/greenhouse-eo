import 'server-only'

import { unstable_cache } from 'next/cache'

import type { CapabilityModuleData, CapabilityViewerContext } from '@/types/capabilities'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildQualitySignals, buildTooling } from '@/lib/dashboard/tenant-dashboard-overrides'
import type {
  GreenhouseDashboardMonthlyDeliveryPoint,
  GreenhouseDashboardQualityPoint,
  GreenhouseDashboardSummary,
  GreenhouseDashboardTooling
} from '@/types/greenhouse-dashboard'

interface AggregateRow {
  project_count: number | string | null
  total_tasks: number | string | null
  active_work_items: number | string | null
  queued_work_items: number | string | null
  blocked_tasks: number | string | null
  client_change_tasks: number | string | null
  review_pressure_tasks: number | string | null
  completed_tasks: number | string | null
  completed_last_30_days: number | string | null
  created_last_30_days: number | string | null
  open_frame_comments: number | string | null
  avg_on_time_pct: number | string | null
  healthy_projects: number | string | null
  projects_at_risk: number | string | null
  last_activity_date: { value?: string } | string | null
  last_synced_at: { value?: string } | string | null
}

interface MonthlyDeliveryRow {
  month_start: { value?: string } | string | null
  total_deliverables: number | string | null
  on_time_pct: number | string | null
  without_client_adjustments: number | string | null
  with_client_adjustments: number | string | null
  total_client_adjustment_rounds: number | string | null
}

interface MeasuredQualityRow {
  month_start: { value?: string } | string | null
  avg_rpa: number | string | null
  positive_rpa_count: number | string | null
}

interface ProjectRow {
  project_id: string | null
  project_name: string | null
  project_status: string | null
  on_time_pct: number | string | null
  active_work_items: number | string | null
  blocked_tasks: number | string | null
  client_change_tasks: number | string | null
  review_pressure_tasks: number | string | null
  queued_work_items: number | string | null
  open_frame_comments: number | string | null
  attention_score: number | string | null
  page_url: string | null
}

export interface CapabilitySnapshotProject {
  id: string
  name: string
  status: string
  onTimePct: number | null
  activeWorkItems: number
  blockedTasks: number
  clientChangeTasks: number
  reviewPressureTasks: number
  queuedWorkItems: number
  openFrameComments: number
  attentionScore: number
  pageUrl: string | null
}

export interface CapabilityModuleSnapshot {
  viewer: CapabilityViewerContext
  scope: CapabilityModuleData['scope']
  summary: GreenhouseDashboardSummary
  projects: CapabilitySnapshotProject[]
  tooling: GreenhouseDashboardTooling
  qualitySignals: GreenhouseDashboardQualityPoint[]
}

const doneStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const closedStatuses = ['Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled']
const blockedStatuses = ['Bloqueado', 'Detenido']
const queuedStatuses = ['Sin empezar', 'Backlog', 'Pendiente']

const monthLabelFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC'
})

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

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = toNumber(value)

  return Number.isFinite(numericValue) ? numericValue : null
}

const toIsoString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

const formatMonthLabel = (monthValue: string | null) => {
  if (!monthValue) {
    return '--'
  }

  return monthLabelFormatter.format(new Date(`${monthValue}T00:00:00.000Z`))
}

const buildEmptySnapshot = (viewer: CapabilityViewerContext): CapabilityModuleSnapshot => ({
  viewer,
  scope: {
    projectCount: 0,
    businessLines: viewer.businessLines,
    serviceModules: viewer.serviceModules,
    lastActivityAt: null,
    lastSyncedAt: null
  },
  summary: {
    avgOnTimePct: 0,
    activeWorkItems: 0,
    blockedTasks: 0,
    clientChangeTasks: 0,
    completedLast30Days: 0,
    completedTasks: 0,
    completionRate: 0,
    createdLast30Days: 0,
    healthyProjects: 0,
    netFlowLast30Days: 0,
    openFrameComments: 0,
    projectsAtRisk: 0,
    queuedWorkItems: 0,
    reviewPressureTasks: 0,
    totalTasks: 0
  },
  projects: [],
  tooling: buildTooling(viewer.clientId, viewer.serviceModules),
  qualitySignals: []
})

const getCapabilityModuleSnapshotUncached = async (viewer: CapabilityViewerContext): Promise<CapabilityModuleSnapshot> => {
  if (viewer.projectIds.length === 0) {
    return buildEmptySnapshot(viewer)
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const sharedCtes = `
    WITH scoped_tasks AS (
      SELECT * EXCEPT(scope_rank)
      FROM (
        SELECT
          t.notion_page_id AS task_id,
          scoped_project_id,
          t.estado,
          COALESCE(t.cumplimiento, '') AS cumplimiento,
          COALESCE(t.completitud, '') AS completitud,
          COALESCE(SAFE_CAST(t.client_change_round_final AS INT64), 0) AS client_change_round_final,
          COALESCE(SAFE_CAST(t.rpa AS FLOAT64), 0) AS rpa_value,
          COALESCE(t.client_review_open, FALSE) AS client_review_open,
          COALESCE(t.workflow_review_open, FALSE) AS workflow_review_open,
          COALESCE(SAFE_CAST(t.open_frame_comments AS INT64), 0) AS open_frame_comments,
          COALESCE(ARRAY_LENGTH(t.bloqueado_por_ids), 0) AS blocked_references,
          DATE(t.created_time) AS created_date,
          DATE(t.fecha_de_completado) AS completed_date,
          t._synced_at AS synced_at,
          ROW_NUMBER() OVER (PARTITION BY t.notion_page_id ORDER BY scoped_project_id) AS scope_rank
        FROM \`${projectId}.notion_ops.tareas\` AS t
        LEFT JOIN UNNEST(t.proyecto_ids) AS scoped_project_id
        WHERE scoped_project_id IN UNNEST(@projectIds)
      )
      WHERE scope_rank = 1
    ),
    annotated_tasks AS (
      SELECT
        task_id,
        scoped_project_id,
        estado,
        cumplimiento,
        completitud,
        client_change_round_final,
        rpa_value,
        client_review_open,
        workflow_review_open,
        open_frame_comments,
        blocked_references,
        created_date,
        completed_date,
        synced_at,
        CASE
          WHEN estado IN UNNEST(@doneStatuses) THEN 'completed'
          WHEN estado IN UNNEST(@closedStatuses) THEN 'closed'
          WHEN estado IN UNNEST(@blockedStatuses) OR blocked_references > 0 THEN 'blocked'
          WHEN estado = 'Cambios Solicitados' THEN 'changes'
          WHEN estado = 'En curso' THEN 'active'
          WHEN estado LIKE 'Listo para revis%' THEN 'review'
          WHEN estado IN UNNEST(@queuedStatuses) OR estado LIKE 'Listo para dise%' THEN 'queued'
          ELSE 'other'
        END AS state_group,
        CASE
          WHEN LOWER(completitud) LIKE '%completada a tiempo%' THEN 'on_time'
          WHEN SAFE_CAST(REGEXP_REPLACE(cumplimiento, r'[^0-9.]', '') AS FLOAT64) >= 100 THEN 'on_time'
          WHEN LOWER(cumplimiento) LIKE '%incumpl%' THEN 'late'
          WHEN SAFE_CAST(REGEXP_REPLACE(cumplimiento, r'[^0-9.]', '') AS FLOAT64) > 0 THEN 'late'
          ELSE 'unknown'
        END AS delivery_signal
      FROM scoped_tasks
    ),
    scoped_projects AS (
      SELECT
        notion_page_id AS project_id,
        COALESCE(nombre_del_proyecto, notion_page_id) AS project_name,
        COALESCE(estado, 'Sin estado') AS project_status,
        SAFE_CAST(REGEXP_REPLACE(COALESCE(pct_on_time, ''), r'[^0-9.]', '') AS FLOAT64) AS on_time_pct,
        page_url
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id IN UNNEST(@projectIds)
    )
  `

  const aggregateQuery = `
    ${sharedCtes}
    SELECT
      COUNT(DISTINCT scoped_project_id) AS project_count,
      COUNT(*) AS total_tasks,
      COUNTIF(state_group IN ('active', 'review', 'changes', 'blocked')) AS active_work_items,
      COUNTIF(state_group = 'queued') AS queued_work_items,
      COUNTIF(state_group = 'blocked') AS blocked_tasks,
      COUNTIF(state_group = 'changes') AS client_change_tasks,
      COUNTIF(client_review_open OR workflow_review_open OR open_frame_comments > 0 OR state_group IN ('review', 'changes')) AS review_pressure_tasks,
      COUNTIF(state_group = 'completed') AS completed_tasks,
      COUNTIF(completed_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) AS completed_last_30_days,
      COUNTIF(created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) AS created_last_30_days,
      SUM(open_frame_comments) AS open_frame_comments,
      (SELECT ROUND(AVG(on_time_pct), 0) FROM scoped_projects) AS avg_on_time_pct,
      (SELECT COUNTIF(on_time_pct >= 75) FROM scoped_projects) AS healthy_projects,
      (SELECT COUNTIF(on_time_pct < 60 OR on_time_pct IS NULL) FROM scoped_projects) AS projects_at_risk,
      MAX(COALESCE(completed_date, created_date)) AS last_activity_date,
      MAX(synced_at) AS last_synced_at
    FROM annotated_tasks
  `

  const projectsQuery = `
    ${sharedCtes}
    , task_summary AS (
      SELECT
        scoped_project_id AS project_id,
        COUNTIF(state_group IN ('active', 'review', 'changes', 'blocked')) AS active_work_items,
        COUNTIF(state_group = 'blocked') AS blocked_tasks,
        COUNTIF(state_group = 'changes') AS client_change_tasks,
        COUNTIF(client_review_open OR workflow_review_open OR open_frame_comments > 0 OR state_group IN ('review', 'changes')) AS review_pressure_tasks,
        COUNTIF(state_group = 'queued') AS queued_work_items,
        SUM(open_frame_comments) AS open_frame_comments
      FROM annotated_tasks
      GROUP BY 1
    )
    SELECT
      COALESCE(scoped_projects.project_id, task_summary.project_id) AS project_id,
      COALESCE(scoped_projects.project_name, task_summary.project_id) AS project_name,
      COALESCE(scoped_projects.project_status, 'Sin estado') AS project_status,
      scoped_projects.on_time_pct,
      task_summary.active_work_items,
      task_summary.blocked_tasks,
      task_summary.client_change_tasks,
      task_summary.review_pressure_tasks,
      task_summary.queued_work_items,
      task_summary.open_frame_comments,
      scoped_projects.page_url,
      ROUND(
        COALESCE(100 - scoped_projects.on_time_pct, 35)
        + (task_summary.active_work_items * 1.5)
        + (task_summary.review_pressure_tasks * 4)
        + (task_summary.blocked_tasks * 8),
        1
      ) AS attention_score
    FROM task_summary
    LEFT JOIN scoped_projects
      ON scoped_projects.project_id = task_summary.project_id
    ORDER BY attention_score DESC, task_summary.blocked_tasks DESC, task_summary.review_pressure_tasks DESC
    LIMIT 12
  `

  const monthlyDeliveryQuery = `
    ${sharedCtes}
    SELECT
      CAST(DATE_TRUNC(created_date, MONTH) AS STRING) AS month_start,
      COUNT(*) AS total_deliverables,
      ROUND(
        SAFE_MULTIPLY(
          SAFE_DIVIDE(
            COUNTIF(delivery_signal = 'on_time'),
            NULLIF(COUNTIF(delivery_signal IN ('on_time', 'late')), 0)
          ),
          100
        ),
        0
      ) AS on_time_pct,
      COUNTIF(client_change_round_final = 0) AS without_client_adjustments,
      COUNTIF(client_change_round_final > 0) AS with_client_adjustments,
      SUM(client_change_round_final) AS total_client_adjustment_rounds
    FROM annotated_tasks
    GROUP BY 1
    ORDER BY 1
  `

  const monthlyQualityQuery = `
    ${sharedCtes}
    SELECT
      CAST(DATE_TRUNC(created_date, MONTH) AS STRING) AS month_start,
      ROUND(AVG(NULLIF(rpa_value, 0)), 2) AS avg_rpa,
      COUNTIF(rpa_value > 0) AS positive_rpa_count
    FROM annotated_tasks
    GROUP BY 1
    ORDER BY 1
  `

  const queryParams = {
    projectIds: viewer.projectIds,
    doneStatuses,
    closedStatuses,
    blockedStatuses,
    queuedStatuses
  }

  const [aggregateResponse, projectsResponse, monthlyDeliveryResponse, monthlyQualityResponse] = await Promise.all([
    bigQuery.query({ query: aggregateQuery, params: queryParams }),
    bigQuery.query({ query: projectsQuery, params: queryParams }),
    bigQuery.query({ query: monthlyDeliveryQuery, params: queryParams }),
    bigQuery.query({ query: monthlyQualityQuery, params: queryParams })
  ])

  const aggregateRow = (aggregateResponse[0] as AggregateRow[])[0]

  if (!aggregateRow) {
    return buildEmptySnapshot(viewer)
  }

  const summary: GreenhouseDashboardSummary = {
    avgOnTimePct: Math.max(0, Math.min(100, Math.round(toNumber(aggregateRow.avg_on_time_pct)))),
    activeWorkItems: toNumber(aggregateRow.active_work_items),
    blockedTasks: toNumber(aggregateRow.blocked_tasks),
    clientChangeTasks: toNumber(aggregateRow.client_change_tasks),
    completedLast30Days: toNumber(aggregateRow.completed_last_30_days),
    completedTasks: toNumber(aggregateRow.completed_tasks),
    completionRate:
      toNumber(aggregateRow.total_tasks) > 0
        ? Math.round((toNumber(aggregateRow.completed_tasks) / toNumber(aggregateRow.total_tasks)) * 100)
        : 0,
    createdLast30Days: toNumber(aggregateRow.created_last_30_days),
    healthyProjects: toNumber(aggregateRow.healthy_projects),
    netFlowLast30Days: toNumber(aggregateRow.completed_last_30_days) - toNumber(aggregateRow.created_last_30_days),
    openFrameComments: toNumber(aggregateRow.open_frame_comments),
    projectsAtRisk: toNumber(aggregateRow.projects_at_risk),
    queuedWorkItems: toNumber(aggregateRow.queued_work_items),
    reviewPressureTasks: toNumber(aggregateRow.review_pressure_tasks),
    totalTasks: toNumber(aggregateRow.total_tasks)
  }

  const monthlyDelivery = (monthlyDeliveryResponse[0] as MonthlyDeliveryRow[]).map(
    (row): GreenhouseDashboardMonthlyDeliveryPoint => ({
      month: toIsoString(row.month_start) || '',
      label: formatMonthLabel(toIsoString(row.month_start)),
      totalDeliverables: toNumber(row.total_deliverables),
      onTimePct: toNullableNumber(row.on_time_pct),
      withoutClientAdjustments: toNumber(row.without_client_adjustments),
      withClientAdjustments: toNumber(row.with_client_adjustments),
      totalClientAdjustmentRounds: toNumber(row.total_client_adjustment_rounds)
    })
  )

  const measuredSignals = (monthlyQualityResponse[0] as MeasuredQualityRow[]).map(row => ({
    month: toIsoString(row.month_start) || '',
    label: formatMonthLabel(toIsoString(row.month_start)),
    avgRpa: toNullableNumber(row.avg_rpa),
    hasReliableRpa: toNumber(row.positive_rpa_count) > 0
  }))

  const projects = (projectsResponse[0] as ProjectRow[]).map(
    (row): CapabilitySnapshotProject => ({
      id: row.project_id || 'unknown-project',
      name: row.project_name || row.project_id || 'Proyecto sin nombre',
      status: row.project_status || 'Sin estado',
      onTimePct: toNullableNumber(row.on_time_pct),
      activeWorkItems: toNumber(row.active_work_items),
      blockedTasks: toNumber(row.blocked_tasks),
      clientChangeTasks: toNumber(row.client_change_tasks),
      reviewPressureTasks: toNumber(row.review_pressure_tasks),
      queuedWorkItems: toNumber(row.queued_work_items),
      openFrameComments: toNumber(row.open_frame_comments),
      attentionScore: toNumber(row.attention_score),
      pageUrl: row.page_url
    })
  )

  const projectCount = Math.max(toNumber(aggregateRow.project_count), projects.length, viewer.projectIds.length)

  return {
    viewer,
    scope: {
      projectCount,
      businessLines: viewer.businessLines,
      serviceModules: viewer.serviceModules,
      lastActivityAt: toIsoString(aggregateRow.last_activity_date),
      lastSyncedAt: toIsoString(aggregateRow.last_synced_at)
    },
    summary,
    projects,
    tooling: buildTooling(viewer.clientId, viewer.serviceModules),
    qualitySignals: buildQualitySignals(viewer.clientId, monthlyDelivery, measuredSignals)
  }
}

const getCachedCapabilityModuleSnapshot = unstable_cache(
  async (
    clientId: string,
    clientName: string,
    projectIdsJson: string,
    businessLinesJson: string,
    serviceModulesJson: string
  ) =>
    getCapabilityModuleSnapshotUncached({
      clientId,
      clientName,
      projectIds: JSON.parse(projectIdsJson) as string[],
      businessLines: JSON.parse(businessLinesJson) as string[],
      serviceModules: JSON.parse(serviceModulesJson) as string[]
    }),
  ['capability-module-snapshot'],
  { revalidate: 3600 }
)

export const getCapabilityModuleSnapshot = (viewer: CapabilityViewerContext) =>
  getCachedCapabilityModuleSnapshot(
    viewer.clientId,
    viewer.clientName,
    JSON.stringify(viewer.projectIds),
    JSON.stringify(viewer.businessLines),
    JSON.stringify(viewer.serviceModules)
  )
