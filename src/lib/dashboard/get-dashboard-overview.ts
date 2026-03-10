import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildAccountTeam, buildQualitySignals, buildTooling } from '@/lib/dashboard/tenant-dashboard-overrides'
import type {
  GreenhouseDashboardData,
  GreenhouseDashboardKpi,
  GreenhouseDashboardMonthlyDeliveryPoint,
  GreenhouseDashboardMixItem,
  GreenhouseDashboardProjectRisk,
  GreenhouseDashboardRelationship,
  GreenhouseDashboardSummary,
  GreenhouseDashboardThroughputPoint
} from '@/types/greenhouse-dashboard'

interface DashboardViewerScope {
  clientId: string
  projectIds: string[]
  businessLines: string[]
  serviceModules: string[]
}

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
  first_activity_date: { value?: string } | string | null
  last_synced_at: { value?: string } | string | null
}

interface ThroughputRow {
  month_start: { value?: string } | string | null
  created_count: number | string | null
  completed_count: number | string | null
}

interface MixRow {
  group_key: string | null
  item_count: number | string | null
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

interface TeamSignalRow {
  member_name: string | null
}

interface ProjectRiskRow {
  project_id: string | null
  project_name: string | null
  project_status: string | null
  on_time_pct: number | string | null
  active_work_items: number | string | null
  blocked_tasks: number | string | null
  review_pressure_tasks: number | string | null
  queued_work_items: number | string | null
  open_frame_comments: number | string | null
  attention_score: number | string | null
  page_url: string | null
}

const doneStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const closedStatuses = ['Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled']
const blockedStatuses = ['Bloqueado', 'Detenido']
const queuedStatuses = ['Sin empezar', 'Backlog', 'Pendiente']

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

const monthLabelFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC'
})

const formatMonthLabel = (monthValue: string | null) => {
  if (!monthValue) {
    return '--'
  }

  const date = new Date(`${monthValue}T00:00:00.000Z`)

  return monthLabelFormatter.format(date)
}

const toDateOnly = (value: string | null) => {
  if (!value) {
    return null
  }

  return value.slice(0, 10)
}

const getRelationshipFromDate = (startedAt: string | null): GreenhouseDashboardRelationship => {
  const startDateOnly = toDateOnly(startedAt)

  if (!startDateOnly) {
    return {
      startedAt: null,
      months: 0,
      days: 0,
      label: 'Sin historico visible'
    }
  }

  const startDate = new Date(`${startDateOnly}T00:00:00.000Z`)
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let months = (todayUtc.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (todayUtc.getUTCMonth() - startDate.getUTCMonth())

  if (todayUtc.getUTCDate() < startDate.getUTCDate()) {
    months -= 1
  }

  const boundedMonths = Math.max(months, 0)
  const anchorDate = new Date(startDate)

  anchorDate.setUTCMonth(anchorDate.getUTCMonth() + boundedMonths)

  const days = Math.max(0, Math.floor((todayUtc.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24)))


  return {
    startedAt: startDateOnly,
    months: boundedMonths,
    days,
    label: `Desde hace ${boundedMonths} meses y ${days} dias formas parte de nuestra Greenhouse.`
  }
}

const mapStatusLabel = (groupKey: string) => {
  switch (groupKey) {
    case 'active':
      return 'En curso'
    case 'review':
      return 'En revision'
    case 'changes':
      return 'Cambios cliente'
    case 'blocked':
      return 'Bloqueadas'
    case 'queued':
      return 'En cola'
    case 'completed':
      return 'Entregadas'
    case 'closed':
      return 'Cerradas'
    default:
      return 'Otro'
  }
}

const mapEffortLabel = (groupKey: string) => {
  switch (groupKey) {
    case 'high':
      return 'Esfuerzo alto'
    case 'medium':
      return 'Esfuerzo medio'
    case 'low':
      return 'Esfuerzo bajo'
    default:
      return 'Sin estimacion'
  }
}

const buildKpis = (summary: GreenhouseDashboardSummary, projectCount: number): GreenhouseDashboardKpi[] => [
  {
    label: 'Piezas entregadas',
    value: String(summary.completedLast30Days),
    detail: `${summary.createdLast30Days} creadas en 30 dias dentro de ${projectCount} proyectos`,
    tone: summary.netFlowLast30Days >= 0 ? 'success' : 'warning'
  },
  {
    label: 'Salud on-time',
    value: `${summary.avgOnTimePct}%`,
    detail: `${summary.healthyProjects} proyectos saludables y ${summary.projectsAtRisk} bajo observacion`,
    tone: summary.avgOnTimePct >= 75 ? 'success' : summary.avgOnTimePct >= 60 ? 'warning' : 'error'
  },
  {
    label: 'Trabajo activo',
    value: String(summary.activeWorkItems),
    detail: `${summary.queuedWorkItems} en cola y ${summary.blockedTasks} bloqueadas`,
    tone: summary.blockedTasks > 3 ? 'error' : summary.queuedWorkItems > summary.activeWorkItems ? 'warning' : 'info'
  },
  {
    label: 'Presion de revision',
    value: String(summary.reviewPressureTasks),
    detail: `${summary.clientChangeTasks} con cambios cliente y ${summary.openFrameComments} comentarios abiertos`,
    tone: summary.reviewPressureTasks > 8 ? 'error' : summary.reviewPressureTasks > 3 ? 'warning' : 'success'
  }
]

const buildEmptyDashboardData = (scope: DashboardViewerScope): GreenhouseDashboardData => ({
  kpis: [
    {
      label: 'Piezas entregadas',
      value: '0',
      detail: 'No hay proyectos conectados al tenant todavia',
      tone: 'info'
    },
    {
      label: 'Salud on-time',
      value: '0%',
      detail: 'Todavia no hay proyectos con historico visible',
      tone: 'warning'
    },
    {
      label: 'Trabajo activo',
      value: '0',
      detail: 'No hay trabajo en alcance para este portal',
      tone: 'info'
    },
    {
      label: 'Presion de revision',
      value: '0',
      detail: 'No hay tareas en revision ni comentarios abiertos',
      tone: 'success'
    }
  ],
  scope: {
    clientId: scope.clientId,
    projectCount: 0,
    projectIds: scope.projectIds,
    businessLines: scope.businessLines,
    serviceModules: scope.serviceModules,
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
  relationship: {
    startedAt: null,
    months: 0,
    days: 0,
    label: 'Sin historico visible'
  },
  accountTeam: {
    members: [],
    totalMonthlyHours: 0,
    averageAllocationPct: null
  },
  tooling: {
    technologyTools: [],
    aiTools: []
  },
  qualitySignals: [],
  charts: {
    throughput: [],
    monthlyDelivery: [],
    statusMix: [],
    effortMix: []
  },
  projects: []
})

export const getDashboardOverview = async (scope: DashboardViewerScope): Promise<GreenhouseDashboardData> => {
  if (scope.projectIds.length === 0) {
    return buildEmptyDashboardData(scope)
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
          t.esfuerzo,
          COALESCE(t.cumplimiento, '') AS cumplimiento,
          COALESCE(t.completitud, '') AS completitud,
          COALESCE(SAFE_CAST(t.client_change_round_final AS INT64), 0) AS client_change_round_final,
          COALESCE(SAFE_CAST(t.rpa AS FLOAT64), 0) AS rpa_value,
          COALESCE(t.responsables_names, []) AS responsables_names,
          COALESCE(t.client_review_open, FALSE) AS client_review_open,
          COALESCE(t.workflow_review_open, FALSE) AS workflow_review_open,
          COALESCE(SAFE_CAST(t.open_frame_comments AS INT64), 0) AS open_frame_comments,
          COALESCE(ARRAY_LENGTH(t.bloqueado_por_ids), 0) AS blocked_references,
          DATE(t.created_time) AS created_date,
          DATE(t.fecha_de_completado) AS completed_date,
          t._synced_at AS synced_at,
          ROW_NUMBER() OVER (PARTITION BY t.notion_page_id ORDER BY scoped_project_id) AS scope_rank
        FROM \`${projectId}.notion_ops.tareas\` t
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
        esfuerzo,
        cumplimiento,
        completitud,
        client_change_round_final,
        rpa_value,
        responsables_names,
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
          WHEN esfuerzo = 'Alto' THEN 'high'
          WHEN esfuerzo = 'Medio' THEN 'medium'
          WHEN esfuerzo = 'Bajo' THEN 'low'
          ELSE 'unknown'
        END AS effort_group,
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
      COALESCE(propietario_names, []) AS propietario_names,
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
      MIN(created_date) AS first_activity_date,
      MAX(synced_at) AS last_synced_at
    FROM annotated_tasks
  `

  const throughputQuery = `
    ${sharedCtes}
    , months AS (
      SELECT month_start
      FROM UNNEST(
        GENERATE_DATE_ARRAY(
          DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 5 MONTH), MONTH),
          DATE_TRUNC(CURRENT_DATE(), MONTH),
          INTERVAL 1 MONTH
        )
      ) AS month_start
    ),
    created_counts AS (
      SELECT DATE_TRUNC(created_date, MONTH) AS month_start, COUNT(*) AS created_count
      FROM annotated_tasks
      GROUP BY 1
    ),
    completed_counts AS (
      SELECT DATE_TRUNC(completed_date, MONTH) AS month_start, COUNT(*) AS completed_count
      FROM annotated_tasks
      WHERE completed_date IS NOT NULL
      GROUP BY 1
    )
    SELECT
      CAST(months.month_start AS STRING) AS month_start,
      COALESCE(created_counts.created_count, 0) AS created_count,
      COALESCE(completed_counts.completed_count, 0) AS completed_count
    FROM months
    LEFT JOIN created_counts
      ON created_counts.month_start = months.month_start
    LEFT JOIN completed_counts
      ON completed_counts.month_start = months.month_start
    ORDER BY months.month_start
  `

  const statusMixQuery = `
    ${sharedCtes}
    SELECT state_group AS group_key, COUNT(*) AS item_count
    FROM annotated_tasks
    WHERE state_group != 'other'
    GROUP BY 1
    ORDER BY item_count DESC
  `

  const effortMixQuery = `
    ${sharedCtes}
    SELECT effort_group AS group_key, COUNT(*) AS item_count
    FROM annotated_tasks
    WHERE state_group NOT IN ('closed')
    GROUP BY 1
    ORDER BY item_count DESC
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

  const projectsQuery = `
    ${sharedCtes}
    , task_summary AS (
      SELECT
        scoped_project_id AS project_id,
        COUNTIF(state_group IN ('active', 'review', 'changes', 'blocked')) AS active_work_items,
        COUNTIF(state_group = 'blocked') AS blocked_tasks,
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
    LIMIT 5
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

  const teamSignalsQuery = `
    ${sharedCtes}
    SELECT member_name
    FROM (
      SELECT DISTINCT member_name
      FROM scoped_projects,
      UNNEST(propietario_names) AS member_name

      UNION DISTINCT

      SELECT DISTINCT member_name
      FROM annotated_tasks,
      UNNEST(responsables_names) AS member_name
    )
    WHERE member_name IS NOT NULL AND TRIM(member_name) != ''
    ORDER BY member_name
  `

  const queryParams = {
    projectIds: scope.projectIds,
    doneStatuses,
    closedStatuses,
    blockedStatuses,
    queuedStatuses
  }

  const [
    aggregateResponse,
    throughputResponse,
    statusMixResponse,
    effortMixResponse,
    monthlyDeliveryResponse,
    monthlyQualityResponse,
    teamSignalsResponse,
    projectsResponse
  ] = await Promise.all([
    bigQuery.query({ query: aggregateQuery, params: queryParams }),
    bigQuery.query({ query: throughputQuery, params: queryParams }),
    bigQuery.query({ query: statusMixQuery, params: queryParams }),
    bigQuery.query({ query: effortMixQuery, params: queryParams }),
    bigQuery.query({ query: monthlyDeliveryQuery, params: queryParams }),
    bigQuery.query({ query: monthlyQualityQuery, params: queryParams }),
    bigQuery.query({ query: teamSignalsQuery, params: queryParams }),
    bigQuery.query({ query: projectsQuery, params: queryParams })
  ])

  const aggregateRow = (aggregateResponse[0] as AggregateRow[])[0]

  if (!aggregateRow) {
    return buildEmptyDashboardData(scope)
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

  const throughput = (throughputResponse[0] as ThroughputRow[]).map(
    (row): GreenhouseDashboardThroughputPoint => ({
      month: toIsoString(row.month_start) || '',
      label: formatMonthLabel(toIsoString(row.month_start)),
      created: toNumber(row.created_count),
      completed: toNumber(row.completed_count)
    })
  )

  const statusMix = (statusMixResponse[0] as MixRow[])
    .map(
      (row): GreenhouseDashboardMixItem => ({
        key: row.group_key || 'other',
        label: mapStatusLabel(row.group_key || 'other'),
        value: toNumber(row.item_count)
      })
    )
    .filter(item => item.value > 0)

  const effortMix = (effortMixResponse[0] as MixRow[])
    .map(
      (row): GreenhouseDashboardMixItem => ({
        key: row.group_key || 'unknown',
        label: mapEffortLabel(row.group_key || 'unknown'),
        value: toNumber(row.item_count)
      })
    )
    .filter(item => item.value > 0)

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

  const measuredQualitySignals = (monthlyQualityResponse[0] as MeasuredQualityRow[]).map(row => ({
    month: toIsoString(row.month_start) || '',
    label: formatMonthLabel(toIsoString(row.month_start)),
    avgRpa: toNullableNumber(row.avg_rpa),
    hasReliableRpa: toNumber(row.positive_rpa_count) > 0
  }))

  const detectedSignals = (teamSignalsResponse[0] as TeamSignalRow[])
    .map(row => (row.member_name || '').trim())
    .filter(Boolean)

  const projects = (projectsResponse[0] as ProjectRiskRow[]).map(
    (row): GreenhouseDashboardProjectRisk => ({
      id: row.project_id || 'unknown-project',
      name: row.project_name || row.project_id || 'Proyecto sin nombre',
      status: row.project_status || 'Sin estado',
      onTimePct: toNullableNumber(row.on_time_pct),
      activeWorkItems: toNumber(row.active_work_items),
      blockedTasks: toNumber(row.blocked_tasks),
      reviewPressureTasks: toNumber(row.review_pressure_tasks),
      queuedWorkItems: toNumber(row.queued_work_items),
      openFrameComments: toNumber(row.open_frame_comments),
      attentionScore: toNumber(row.attention_score),
      pageUrl: row.page_url
    })
  )

  const projectCount = Math.max(toNumber(aggregateRow.project_count), projects.length, scope.projectIds.length)
  const relationship = getRelationshipFromDate(toIsoString(aggregateRow.first_activity_date))
  const accountTeam = buildAccountTeam(scope.clientId, detectedSignals)
  const tooling = buildTooling(scope.clientId, scope.serviceModules)
  const qualitySignals = buildQualitySignals(scope.clientId, monthlyDelivery, measuredQualitySignals)

  return {
    kpis: buildKpis(summary, projectCount),
    scope: {
      clientId: scope.clientId,
      projectCount,
      projectIds: scope.projectIds,
      businessLines: scope.businessLines,
      serviceModules: scope.serviceModules,
      lastSyncedAt: toIsoString(aggregateRow.last_synced_at)
    },
    summary,
    relationship,
    accountTeam,
    tooling,
    qualitySignals,
    charts: {
      throughput,
      monthlyDelivery,
      statusMix,
      effortMix
    },
    projects
  }
}
