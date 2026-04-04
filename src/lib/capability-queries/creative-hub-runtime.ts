import 'server-only'

import { unstable_cache } from 'next/cache'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { CapabilityViewerContext } from '@/types/capabilities'

type BigQueryScalar = { value?: string } | string | null

type CreativeHubTaskRow = {
  task_id: string | null
  space_id: string | null
  task_name: string | null
  project_id: string | null
  project_name: string | null
  task_status: string | null
  created_at: BigQueryScalar
  last_edited_at: BigQueryScalar
  completed_at: BigQueryScalar
  deadline_at: BigQueryScalar
  explicit_csc_phase: string | null
  frame_versions: number | string | null
  client_change_rounds: number | string | null
  workflow_change_rounds: number | string | null
  rpa_value: number | string | null
  client_review_open: boolean | string | null
  workflow_review_open: boolean | string | null
  open_frame_comments: number | string | null
  frame_url: string | null
  asset_type: string | null
  lane: string | null
  project_page_url: string | null
}

export type CreativeHubTask = {
  id: string
  spaceId: string | null
  name: string
  projectId: string
  projectName: string
  status: string
  createdAt: string | null
  lastEditedAt: string | null
  completedAt: string | null
  deadlineAt: string | null
  cscPhase: string
  frameVersions: number
  clientChangeRounds: number | null
  workflowChangeRounds: number | null
  rpaValue: number | null
  clientReviewOpen: boolean
  workflowReviewOpen: boolean
  openFrameComments: number
  frameUrl: string | null
  assetType: string | null
  lane: string | null
  projectPageUrl: string | null
  firstTimeRight: boolean | null
  hoursSinceUpdate: number | null
}

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``
const pickFirstExistingColumn = (columns: Set<string>, candidates: string[]) => candidates.find(column => columns.has(column)) || null

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'

  return Boolean(value)
}

const toIsoString = (value: BigQueryScalar) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return typeof value.value === 'string' ? value.value : null
}

const normalizeStatus = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const normalizePhase = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const normalizePhaseLabel = (value: string | null | undefined) => {
  switch (normalizePhase(value)) {
    case 'planning':
      return 'Planning'
    case 'briefing':
      return 'Briefing'
    case 'produccion':
      return 'Produccion'
    case 'aprobacion':
      return 'Aprobacion'
    case 'asset mgmt':
    case 'asset management':
      return 'Asset Mgmt'
    case 'activacion':
      return 'Activacion'
    case 'completado':
      return 'Completado'
    default:
      return null
  }
}

const deriveCreativeCscPhase = ({
  explicitPhase,
  status,
  frameVersions,
  clientReviewOpen,
  workflowReviewOpen,
  frameUrl
}: {
  explicitPhase: string | null
  status: string
  frameVersions: number
  clientReviewOpen: boolean
  workflowReviewOpen: boolean
  frameUrl: string | null
}) => {
  const normalizedExplicit = normalizePhaseLabel(explicitPhase)

  if (normalizedExplicit) {
    return normalizedExplicit
  }

  const normalizedStatus = normalizeStatus(status)
  const hasFrameAsset = Boolean(frameUrl) || frameVersions > 0
  const reviewOpen = clientReviewOpen || workflowReviewOpen

  if (['backlog', 'por hacer', 'sin empezar', 'pendiente'].includes(normalizedStatus)) {
    return 'Planning'
  }

  if (normalizedStatus === 'brief en revision' || (normalizedStatus === 'en curso' && !hasFrameAsset && !reviewOpen)) {
    return 'Briefing'
  }

  if (normalizedStatus === 'en curso' && hasFrameAsset && !reviewOpen) {
    return 'Produccion'
  }

  if (normalizedStatus === 'listo para revision' || normalizedStatus === 'cambios solicitados' || reviewOpen) {
    return 'Aprobacion'
  }

  if (['aprobado', 'en entrega'].includes(normalizedStatus)) {
    return 'Asset Mgmt'
  }

  if (['publicado', 'activado', 'en distribucion'].includes(normalizedStatus)) {
    return 'Activacion'
  }

  if (['listo', 'done', 'finalizado', 'completado'].includes(normalizedStatus)) {
    return 'Completado'
  }

  return hasFrameAsset ? 'Produccion' : 'Planning'
}

const getTableColumns = async (dataset: string, tableName: string) => {
  const projectId = getBigQueryProjectId()

  const [rows] = await getBigQueryClient().query({
    query: `
      SELECT column_name
      FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableName
    `,
    params: { tableName }
  })

  return new Set(
    (rows as Array<{ column_name: string | null }>)
      .map(row => row.column_name || '')
      .filter(Boolean)
  )
}

const getOptionalStringExpression = (sourceAlias: string, columnName: string | null, fallback = 'NULL') =>
  columnName ? `CAST(${sourceAlias}.${quoteIdentifier(columnName)} AS STRING)` : fallback

const getOptionalIntExpression = (sourceAlias: string, columnName: string | null, fallback = '0') =>
  columnName ? `COALESCE(SAFE_CAST(${sourceAlias}.${quoteIdentifier(columnName)} AS INT64), 0)` : fallback

const getOptionalFloatExpression = (sourceAlias: string, columnName: string | null, fallback = 'NULL') =>
  columnName ? `SAFE_CAST(${sourceAlias}.${quoteIdentifier(columnName)} AS FLOAT64)` : fallback

const getOptionalBoolExpression = (sourceAlias: string, columnName: string | null, fallback = 'FALSE') =>
  columnName ? `COALESCE(${sourceAlias}.${quoteIdentifier(columnName)}, FALSE)` : fallback

const getOptionalTimestampExpression = (sourceAlias: string, columnName: string | null, fallback = 'NULL') =>
  columnName ? `${sourceAlias}.${quoteIdentifier(columnName)}` : fallback

const getCreativeHubTasksUncached = async (viewer: CapabilityViewerContext): Promise<CreativeHubTask[]> => {
  if (viewer.projectIds.length === 0) {
    return []
  }

  const projectId = getBigQueryProjectId()
  const taskColumns = await getTableColumns('notion_ops', 'tareas')
  const projectColumns = await getTableColumns('notion_ops', 'proyectos')

  if (!taskColumns.has('notion_page_id') || !taskColumns.has('proyecto_ids')) {
    return []
  }

  const taskTitleColumn = pickFirstExistingColumn(taskColumns, ['titulo', 'name', 'nombre'])
  const statusColumn = pickFirstExistingColumn(taskColumns, ['estado', 'status'])
  const spaceIdColumn = pickFirstExistingColumn(taskColumns, ['space_id'])
  const createdAtColumn = pickFirstExistingColumn(taskColumns, ['created_time', 'created_at'])
  const lastEditedAtColumn = pickFirstExistingColumn(taskColumns, ['last_edited_time', 'updated_at', 'created_time'])
  const completedAtColumn = pickFirstExistingColumn(taskColumns, ['fecha_de_completado', 'fecha_entrega', 'completed_at', 'done_at'])
  const deadlineColumn = pickFirstExistingColumn(taskColumns, ['fecha_límite', 'fecha_limite', 'deadline', 'due_date'])
  const explicitPhaseColumn = pickFirstExistingColumn(taskColumns, ['fase_csc'])
  const frameVersionsColumn = pickFirstExistingColumn(taskColumns, ['frame_versions'])
  const clientChangeRoundsColumn = pickFirstExistingColumn(taskColumns, ['client_change_round_final', 'client_change_round'])
  const workflowChangeRoundsColumn = pickFirstExistingColumn(taskColumns, ['workflow_change_round'])
  const rpaColumn = pickFirstExistingColumn(taskColumns, ['rpa', 'frame_versions', 'client_change_round_final', 'client_change_round'])
  const clientReviewOpenColumn = pickFirstExistingColumn(taskColumns, ['client_review_open'])
  const workflowReviewOpenColumn = pickFirstExistingColumn(taskColumns, ['workflow_review_open'])
  const openCommentsColumn = pickFirstExistingColumn(taskColumns, ['open_frame_comments'])
  const frameUrlColumn = pickFirstExistingColumn(taskColumns, ['url_frame_io', 'frame_io_url'])
  const assetTypeColumn = pickFirstExistingColumn(taskColumns, ['tipo_asset'])
  const laneColumn = pickFirstExistingColumn(taskColumns, ['carril'])

  const projectNameColumn = pickFirstExistingColumn(projectColumns, ['nombre_del_proyecto', 'titulo', 'name'])
  const projectPageUrlColumn = pickFirstExistingColumn(projectColumns, ['page_url'])

  const [rows] = await getBigQueryClient().query({
    query: `
      WITH scoped_tasks AS (
        SELECT * EXCEPT(scope_rank)
        FROM (
          SELECT
            t.notion_page_id AS task_id,
            ${getOptionalStringExpression('t', spaceIdColumn)} AS space_id,
            scoped_project_id AS project_id,
            ${getOptionalStringExpression('t', taskTitleColumn, 'CAST(t.notion_page_id AS STRING)')} AS task_name,
            ${getOptionalStringExpression('t', statusColumn, "'Sin estado'")} AS task_status,
            ${getOptionalTimestampExpression('t', createdAtColumn)} AS created_at,
            ${getOptionalTimestampExpression('t', lastEditedAtColumn)} AS last_edited_at,
            ${getOptionalTimestampExpression('t', completedAtColumn)} AS completed_at,
            ${getOptionalTimestampExpression('t', deadlineColumn)} AS deadline_at,
            ${getOptionalStringExpression('t', explicitPhaseColumn)} AS explicit_csc_phase,
            ${getOptionalIntExpression('t', frameVersionsColumn)} AS frame_versions,
            ${getOptionalIntExpression('t', clientChangeRoundsColumn, 'NULL')} AS client_change_rounds,
            ${getOptionalIntExpression('t', workflowChangeRoundsColumn, 'NULL')} AS workflow_change_rounds,
            ${getOptionalFloatExpression('t', rpaColumn)} AS rpa_value,
            ${getOptionalBoolExpression('t', clientReviewOpenColumn)} AS client_review_open,
            ${getOptionalBoolExpression('t', workflowReviewOpenColumn)} AS workflow_review_open,
            ${getOptionalIntExpression('t', openCommentsColumn)} AS open_frame_comments,
            ${getOptionalStringExpression('t', frameUrlColumn)} AS frame_url,
            ${getOptionalStringExpression('t', assetTypeColumn)} AS asset_type,
            ${getOptionalStringExpression('t', laneColumn)} AS lane,
            ROW_NUMBER() OVER (PARTITION BY t.notion_page_id ORDER BY scoped_project_id) AS scope_rank
          FROM \`${projectId}.notion_ops.tareas\` AS t
          LEFT JOIN UNNEST(t.proyecto_ids) AS scoped_project_id
          WHERE scoped_project_id IN UNNEST(@projectIds)
        )
        WHERE scope_rank = 1
      ),
      scoped_projects AS (
        SELECT
          notion_page_id AS project_id,
          ${getOptionalStringExpression('p', projectNameColumn, 'CAST(notion_page_id AS STRING)')} AS project_name,
          ${getOptionalStringExpression('p', projectPageUrlColumn)} AS project_page_url
        FROM \`${projectId}.notion_ops.proyectos\` AS p
        WHERE notion_page_id IN UNNEST(@projectIds)
      )
      SELECT
        scoped_tasks.task_id,
        scoped_tasks.space_id,
        scoped_tasks.task_name,
        scoped_tasks.project_id,
        COALESCE(scoped_projects.project_name, scoped_tasks.project_id) AS project_name,
        scoped_tasks.task_status,
        scoped_tasks.created_at,
        scoped_tasks.last_edited_at,
        scoped_tasks.completed_at,
        scoped_tasks.deadline_at,
        scoped_tasks.explicit_csc_phase,
        scoped_tasks.frame_versions,
        scoped_tasks.client_change_rounds,
        scoped_tasks.workflow_change_rounds,
        scoped_tasks.rpa_value,
        scoped_tasks.client_review_open,
        scoped_tasks.workflow_review_open,
        scoped_tasks.open_frame_comments,
        scoped_tasks.frame_url,
        scoped_tasks.asset_type,
        scoped_tasks.lane,
        scoped_projects.project_page_url
      FROM scoped_tasks
      LEFT JOIN scoped_projects
        ON scoped_projects.project_id = scoped_tasks.project_id
      ORDER BY scoped_tasks.last_edited_at DESC NULLS LAST, scoped_tasks.created_at DESC NULLS LAST
    `,
    params: { projectIds: viewer.projectIds }
  })

  const now = Date.now()

  return (rows as CreativeHubTaskRow[]).map(row => {
    const createdAt = toIsoString(row.created_at)
    const lastEditedAt = toIsoString(row.last_edited_at)
    const completedAt = toIsoString(row.completed_at)
    const deadlineAt = toIsoString(row.deadline_at)
    const frameVersions = toNumber(row.frame_versions)
    const clientChangeRounds = toNullableNumber(row.client_change_rounds)
    const workflowChangeRounds = toNullableNumber(row.workflow_change_rounds)
    const clientReviewOpen = toBoolean(row.client_review_open)
    const workflowReviewOpen = toBoolean(row.workflow_review_open)
    const lastActivityAt = lastEditedAt || createdAt

    const hoursSinceUpdate =
      lastActivityAt && !Number.isNaN(new Date(lastActivityAt).getTime())
        ? Math.max(0, Math.round((((now - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60)) + Number.EPSILON) * 10) / 10)
        : null

    return {
      id: row.task_id || 'unknown-task',
      spaceId: row.space_id || null,
      name: row.task_name || row.task_id || 'Tarea sin nombre',
      projectId: row.project_id || 'unknown-project',
      projectName: row.project_name || row.project_id || 'Proyecto sin nombre',
      status: row.task_status || 'Sin estado',
      createdAt,
      lastEditedAt,
      completedAt,
      deadlineAt,
      cscPhase: deriveCreativeCscPhase({
        explicitPhase: row.explicit_csc_phase,
        status: row.task_status || 'Sin estado',
        frameVersions,
        clientReviewOpen,
        workflowReviewOpen,
        frameUrl: row.frame_url || null
      }),
      frameVersions,
      clientChangeRounds,
      workflowChangeRounds,
      rpaValue: toNullableNumber(row.rpa_value),
      clientReviewOpen,
      workflowReviewOpen,
      openFrameComments: toNumber(row.open_frame_comments),
      frameUrl: row.frame_url || null,
      assetType: row.asset_type || null,
      lane: row.lane || null,
      projectPageUrl: row.project_page_url || null,
      firstTimeRight: completedAt && clientChangeRounds !== null ? clientChangeRounds === 0 : null,
      hoursSinceUpdate
    }
  })
}

const getCachedCreativeHubTasks = unstable_cache(
  async (
    clientId: string,
    clientName: string,
    projectIdsJson: string,
    businessLinesJson: string,
    serviceModulesJson: string
  ) =>
    getCreativeHubTasksUncached({
      clientId,
      clientName,
      projectIds: JSON.parse(projectIdsJson) as string[],
      businessLines: JSON.parse(businessLinesJson) as string[],
      serviceModules: JSON.parse(serviceModulesJson) as string[]
    }),
  ['creative-hub-runtime-tasks'],
  { revalidate: 3600 }
)

export const getCreativeHubTasks = (viewer: CapabilityViewerContext) =>
  getCachedCreativeHubTasks(
    viewer.clientId,
    viewer.clientName,
    JSON.stringify(viewer.projectIds),
    JSON.stringify(viewer.businessLines),
    JSON.stringify(viewer.serviceModules)
  )
