import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getDb } from '@/lib/db'

type InformationSchemaRow = {
  column_name: string
}

type FreshnessAggregateRow = {
  space_id: string | null
  row_count: number | string | null
  max_synced_at: string | null
}

export interface NotionRawFreshnessSpaceSnapshot {
  spaceId: string
  taskRowCount: number
  projectRowCount: number
  sprintRowCount: number
  maxTaskSyncedAt: string | null
  maxProjectSyncedAt: string | null
  maxSprintSyncedAt: string | null
  ready: boolean
  reasons: string[]
}

export interface NotionRawFreshnessGateResult {
  ready: boolean
  reason: string
  checkedAt: string
  boundaryStartAt: string
  freshestRawSyncedAt: string | null
  activeSpaceCount: number
  staleSpaces: NotionRawFreshnessSpaceSnapshot[]
  spaces: NotionRawFreshnessSpaceSnapshot[]
}

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object' && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  const normalized = String(value).trim()

  return normalized || null
}

const toInteger = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  if (typeof value === 'object' && value && 'value' in value) {
    return toInteger((value as { value?: unknown }).value)
  }

  return 0
}

const toTimestampString = (value: unknown) => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  const normalized = toNullableString(value)

  if (!normalized) return null

  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString()
}

const startOfCurrentUtcDay = () => {
  const now = new Date()

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

const readTableColumns = async (dataset: string, table: string) => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT column_name
      FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @table
    `,
    params: { table }
  }) as [InformationSchemaRow[], unknown]

  return new Set(rows.map(row => row.column_name))
}

const readFreshnessBySpace = async ({
  dataset,
  table,
  spaceIds,
  syncedAtExpression
}: {
  dataset: string
  table: string
  spaceIds: string[]
  syncedAtExpression: string
}) => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT
        space_id,
        COUNT(*) AS row_count,
        MAX(${syncedAtExpression}) AS max_synced_at
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE space_id IN UNNEST(@spaceIds)
      GROUP BY space_id
    `,
    params: { spaceIds }
  }) as [FreshnessAggregateRow[], unknown]

  return rows
}

export const evaluateNotionRawFreshnessGate = ({
  spaceIds,
  taskRows,
  projectRows,
  sprintRows,
  boundaryStartAt
}: {
  spaceIds: string[]
  taskRows: FreshnessAggregateRow[]
  projectRows: FreshnessAggregateRow[]
  sprintRows: FreshnessAggregateRow[]
  boundaryStartAt: string
}): NotionRawFreshnessGateResult => {
  const checkedAt = new Date().toISOString()
  const taskMap = new Map(taskRows.map(row => [toNullableString(row.space_id) ?? '', row]))
  const projectMap = new Map(projectRows.map(row => [toNullableString(row.space_id) ?? '', row]))
  const sprintMap = new Map(sprintRows.map(row => [toNullableString(row.space_id) ?? '', row]))

  const spaces = spaceIds.map(spaceId => {
    const taskRow = taskMap.get(spaceId)
    const projectRow = projectMap.get(spaceId)
    const sprintRow = sprintMap.get(spaceId)
    const maxTaskSyncedAt = toTimestampString(taskRow?.max_synced_at ?? null)
    const maxProjectSyncedAt = toTimestampString(projectRow?.max_synced_at ?? null)
    const maxSprintSyncedAt = toTimestampString(sprintRow?.max_synced_at ?? null)
    const taskRowCount = toInteger(taskRow?.row_count ?? 0)
    const projectRowCount = toInteger(projectRow?.row_count ?? 0)
    const sprintRowCount = toInteger(sprintRow?.row_count ?? 0)
    const reasons: string[] = []

    if (taskRowCount === 0) reasons.push('sin filas en notion_ops.tareas')
    if (projectRowCount === 0) reasons.push('sin filas en notion_ops.proyectos')
    if (sprintRowCount === 0) reasons.push('sin filas en notion_ops.sprints')
    if (!maxTaskSyncedAt) reasons.push('notion_ops.tareas sin _synced_at')
    if (!maxProjectSyncedAt) reasons.push('notion_ops.proyectos sin _synced_at')
    if (!maxSprintSyncedAt) reasons.push('notion_ops.sprints sin _synced_at')
    if (maxTaskSyncedAt && maxTaskSyncedAt < boundaryStartAt) reasons.push(`tareas stale (${maxTaskSyncedAt})`)
    if (maxProjectSyncedAt && maxProjectSyncedAt < boundaryStartAt) reasons.push(`proyectos stale (${maxProjectSyncedAt})`)
    if (maxSprintSyncedAt && maxSprintSyncedAt < boundaryStartAt) reasons.push(`sprints stale (${maxSprintSyncedAt})`)

    return {
      spaceId,
      taskRowCount,
      projectRowCount,
      sprintRowCount,
      maxTaskSyncedAt,
      maxProjectSyncedAt,
      maxSprintSyncedAt,
      ready: reasons.length === 0,
      reasons
    } satisfies NotionRawFreshnessSpaceSnapshot
  })

  const staleSpaces = spaces.filter(space => !space.ready)

  const freshestRawSyncedAt = spaces
    .flatMap(space => [space.maxTaskSyncedAt, space.maxProjectSyncedAt, space.maxSprintSyncedAt])
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  return {
    ready: staleSpaces.length === 0,
    reason: staleSpaces.length === 0
      ? `Raw Notion listo para materializar (${spaceIds.length} space(s))`
      : `Raw Notion no está listo para ${staleSpaces.length}/${spaceIds.length} space(s)`,
    checkedAt,
    boundaryStartAt,
    freshestRawSyncedAt,
    activeSpaceCount: spaceIds.length,
    staleSpaces,
    spaces
  }
}

export const getNotionRawFreshnessGate = async (): Promise<NotionRawFreshnessGateResult> => {
  const db = await getDb()

  const activeSources = await db
    .selectFrom('greenhouse_core.space_notion_sources')
    .select('space_id')
    .where('sync_enabled', '=', true)
    .orderBy('space_id', 'asc')
    .execute()

  const spaceIds = activeSources
    .map(row => toNullableString(row.space_id))
    .filter((value): value is string => Boolean(value))

  if (spaceIds.length === 0) {
    return {
      ready: false,
      reason: 'No active space_notion_sources bindings found',
      checkedAt: new Date().toISOString(),
      boundaryStartAt: startOfCurrentUtcDay(),
      freshestRawSyncedAt: null,
      activeSpaceCount: 0,
      staleSpaces: [],
      spaces: []
    }
  }

  const [taskColumns, projectColumns, sprintColumns] = await Promise.all([
    readTableColumns('notion_ops', 'tareas'),
    readTableColumns('notion_ops', 'proyectos'),
    readTableColumns('notion_ops', 'sprints')
  ])

  const taskSyncedAtExpression = taskColumns.has('_synced_at')
    ? 'SAFE_CAST(_synced_at AS TIMESTAMP)'
    : 'SAFE_CAST(created_time AS TIMESTAMP)'

  const projectSyncedAtExpression = projectColumns.has('_synced_at')
    ? 'SAFE_CAST(_synced_at AS TIMESTAMP)'
    : 'SAFE_CAST(created_time AS TIMESTAMP)'

  const sprintSyncedAtExpression = sprintColumns.has('_synced_at')
    ? 'SAFE_CAST(_synced_at AS TIMESTAMP)'
    : 'SAFE_CAST(created_time AS TIMESTAMP)'

  const [taskRows, projectRows, sprintRows] = await Promise.all([
    readFreshnessBySpace({
      dataset: 'notion_ops',
      table: 'tareas',
      spaceIds,
      syncedAtExpression: taskSyncedAtExpression
    }),
    readFreshnessBySpace({
      dataset: 'notion_ops',
      table: 'proyectos',
      spaceIds,
      syncedAtExpression: projectSyncedAtExpression
    }),
    readFreshnessBySpace({
      dataset: 'notion_ops',
      table: 'sprints',
      spaceIds,
      syncedAtExpression: sprintSyncedAtExpression
    })
  ])

  return evaluateNotionRawFreshnessGate({
    spaceIds,
    taskRows,
    projectRows,
    sprintRows,
    boundaryStartAt: startOfCurrentUtcDay()
  })
}
