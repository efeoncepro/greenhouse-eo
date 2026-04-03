import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export type NotionParityPeriodField = 'due_date' | 'created_at'

export type NotionParityMutationField = 'task_status' | 'due_date' | 'assignee_source_id'

export type NotionParityBucket =
  | 'missing_in_conformed'
  | 'missing_in_raw'
  | 'status_mismatch'
  | 'due_date_mismatch'
  | 'assignee_mismatch'
  | 'multiple_mutations'
  | 'fresh_raw_after_conformed_sync'
  | 'hierarchy_gap_candidate'

export interface NotionParityAuditRow {
  task_source_id: string
  space_id: string
  task_name: string
  task_status: string
  due_date: string | null
  assignee_source_id: string | null
  tarea_principal_ids: string[]
  subtareas_ids: string[]
  _synced_at: string
  synced_at?: string | null
  created_at?: string | null
  page_url?: string | null
}

export interface NotionParityAuditBucketEntry {
  task_source_id: string
  space_id: string
  task_name: string
  raw_synced_at: string
  conformed_synced_at: string | null
  mutations: NotionParityMutationField[]
}

export interface NotionParityAuditResult {
  missing_in_conformed: NotionParityAuditBucketEntry[]
  missing_in_raw: NotionParityAuditBucketEntry[]
  status_mismatch: NotionParityAuditBucketEntry[]
  due_date_mismatch: NotionParityAuditBucketEntry[]
  assignee_mismatch: NotionParityAuditBucketEntry[]
  multiple_mutations: NotionParityAuditBucketEntry[]
  fresh_raw_after_conformed_sync: NotionParityAuditBucketEntry[]
  hierarchy_gap_candidate: NotionParityAuditBucketEntry[]
}

export interface DeliveryNotionParityAuditInput {
  spaceId: string
  year: number
  month: number
  periodField?: NotionParityPeriodField
  assigneeSourceId?: string | null
  sampleLimit?: number
}

export interface DeliveryNotionParityAuditSummary {
  rawCount: number
  conformedCount: number
  matchedCount: number
  diffCount: number
  bucketCounts: Record<NotionParityBucket, number>
}

export interface DeliveryNotionParityAuditOutput {
  spaceId: string
  periodField: NotionParityPeriodField
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
  }
  assigneeSourceId: string | null
  conformedSyncedAt: string | null
  summary: DeliveryNotionParityAuditSummary
  buckets: NotionParityAuditResult
}

type InformationSchemaRow = {
  column_name: string
}

const ALL_BUCKETS: NotionParityBucket[] = [
  'missing_in_conformed',
  'missing_in_raw',
  'status_mismatch',
  'due_date_mismatch',
  'assignee_mismatch',
  'multiple_mutations',
  'fresh_raw_after_conformed_sync',
  'hierarchy_gap_candidate'
]

const createEmptyAuditBuckets = (): NotionParityAuditResult => ({
  missing_in_conformed: [],
  missing_in_raw: [],
  status_mismatch: [],
  due_date_mismatch: [],
  assignee_mismatch: [],
  multiple_mutations: [],
  fresh_raw_after_conformed_sync: [],
  hierarchy_gap_candidate: []
})

const createEmptyBucketCounts = (): Record<NotionParityBucket, number> => ({
  missing_in_conformed: 0,
  missing_in_raw: 0,
  status_mismatch: 0,
  due_date_mismatch: 0,
  assignee_mismatch: 0,
  multiple_mutations: 0,
  fresh_raw_after_conformed_sync: 0,
  hierarchy_gap_candidate: 0
})

const toTrimmedString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object' && 'value' in value) {
    return toTrimmedString((value as { value?: unknown }).value)
  }

  const normalized = String(value).trim()

  return normalized || null
}

const toDateString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const normalized = toTrimmedString(value)

  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return normalized.slice(0, 10)
}

const toTimestampString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const normalized = toTrimmedString(value)

  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString()
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(item => toTrimmedString(item))
    .filter((item): item is string => Boolean(item))
}

const normalizeTaskName = (value: unknown) => toTrimmedString(value) ?? 'Sin nombre'

const isSame = (left: string | null, right: string | null) => (left ?? null) === (right ?? null)

const toMonthWindow = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error(`Invalid year '${year}'`)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month '${month}'`)
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0))

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  }
}

const hasHierarchy = (row: Pick<NotionParityAuditRow, 'tarea_principal_ids' | 'subtareas_ids'>) =>
  row.tarea_principal_ids.length > 0 || row.subtareas_ids.length > 0

const isRawFresher = (rawSyncedAt: string | null, conformedSyncedAt: string | null) => {
  if (!rawSyncedAt || !conformedSyncedAt) {
    return false
  }

  return rawSyncedAt > conformedSyncedAt
}

const pushLimited = (
  bucket: NotionParityAuditBucketEntry[],
  entry: NotionParityAuditBucketEntry,
  sampleLimit: number
) => {
  if (bucket.length < sampleLimit) {
    bucket.push(entry)
  }
}

const buildEntry = (
  rawRow: NotionParityAuditRow,
  conformedRow: NotionParityAuditRow | null,
  mutations: NotionParityMutationField[]
): NotionParityAuditBucketEntry => ({
  task_source_id: rawRow.task_source_id,
  space_id: rawRow.space_id,
  task_name: rawRow.task_name,
  raw_synced_at: rawRow._synced_at,
  conformed_synced_at: conformedRow?.synced_at ?? null,
  mutations
})

export const classifyNotionParityAudit = ({
  rawRows,
  conformedRows,
  conformedSyncedAt,
  sampleLimit = 50
}: {
  rawRows: NotionParityAuditRow[]
  conformedRows: NotionParityAuditRow[]
  conformedSyncedAt: string | null
  sampleLimit?: number
}): NotionParityAuditResult => {
  const normalizedSampleLimit = Number.isInteger(sampleLimit) && sampleLimit > 0 ? sampleLimit : 50
  const conformedByTaskId = new Map(conformedRows.map(row => [row.task_source_id, row] as const))
  const result = createEmptyAuditBuckets()

  for (const rawRow of rawRows) {
    const conformedRow = conformedByTaskId.get(rawRow.task_source_id) ?? null
    const mutations: NotionParityMutationField[] = []
    const entry = buildEntry(rawRow, conformedRow, mutations)

    if (!conformedRow) {
      pushLimited(result.missing_in_conformed, entry, normalizedSampleLimit)

      if (isRawFresher(rawRow._synced_at, conformedSyncedAt)) {
        pushLimited(result.fresh_raw_after_conformed_sync, entry, normalizedSampleLimit)
      }

      if (hasHierarchy(rawRow)) {
        pushLimited(result.hierarchy_gap_candidate, entry, normalizedSampleLimit)
      }

      continue
    }

    if (isRawFresher(rawRow._synced_at, conformedRow.synced_at ?? conformedSyncedAt ?? null)) {
      pushLimited(result.fresh_raw_after_conformed_sync, entry, normalizedSampleLimit)
    }

    if (!isSame(rawRow.task_status, conformedRow.task_status)) {
      mutations.push('task_status')
      pushLimited(result.status_mismatch, entry, normalizedSampleLimit)
    }

    if (!isSame(rawRow.due_date, conformedRow.due_date)) {
      mutations.push('due_date')
      pushLimited(result.due_date_mismatch, entry, normalizedSampleLimit)
    }

    if (!isSame(rawRow.assignee_source_id, conformedRow.assignee_source_id)) {
      mutations.push('assignee_source_id')
      pushLimited(result.assignee_mismatch, entry, normalizedSampleLimit)
    }

    if (mutations.length > 1) {
      pushLimited(result.multiple_mutations, entry, normalizedSampleLimit)
    }

    if (hasHierarchy(rawRow) && !hasHierarchy(conformedRow)) {
      pushLimited(result.hierarchy_gap_candidate, entry, normalizedSampleLimit)
    }
  }

  const rawIds = new Set(rawRows.map(row => row.task_source_id))

  for (const conformedRow of conformedRows) {
    if (rawIds.has(conformedRow.task_source_id)) {
      continue
    }

    const entry: NotionParityAuditBucketEntry = {
      task_source_id: conformedRow.task_source_id,
      space_id: conformedRow.space_id,
      task_name: conformedRow.task_name,
      raw_synced_at: '',
      conformed_synced_at: conformedRow.synced_at ?? null,
      mutations: []
    }

    pushLimited(result.missing_in_raw, entry, normalizedSampleLimit)
  }

  return result
}

const summarizeAudit = ({
  rawRows,
  conformedRows,
  conformedSyncedAt
}: {
  rawRows: NotionParityAuditRow[]
  conformedRows: NotionParityAuditRow[]
  conformedSyncedAt: string | null
}): DeliveryNotionParityAuditSummary => {
  const fullBuckets = classifyNotionParityAudit({
    rawRows,
    conformedRows,
    conformedSyncedAt,
    sampleLimit: Number.MAX_SAFE_INTEGER
  })

  const rawIds = new Set(rawRows.map(row => row.task_source_id))
  const conformedIds = new Set(conformedRows.map(row => row.task_source_id))
  let matchedCount = 0

  for (const rawRow of rawRows) {
    const hasMatch = conformedIds.has(rawRow.task_source_id)

    const hasMutation =
      fullBuckets.status_mismatch.some(entry => entry.task_source_id === rawRow.task_source_id) ||
      fullBuckets.due_date_mismatch.some(entry => entry.task_source_id === rawRow.task_source_id) ||
      fullBuckets.assignee_mismatch.some(entry => entry.task_source_id === rawRow.task_source_id)

    if (hasMatch && !hasMutation) {
      matchedCount++
    }
  }

  const bucketCounts = createEmptyBucketCounts()

  for (const bucket of ALL_BUCKETS) {
    const rows = fullBuckets[bucket]
    const uniqueIds = new Set(rows.map(row => row.task_source_id))

    bucketCounts[bucket] = uniqueIds.size
  }

  const diffIds = new Set<string>()

  for (const bucket of ALL_BUCKETS) {
    for (const row of fullBuckets[bucket]) {
      diffIds.add(row.task_source_id)
    }
  }

  return {
    rawCount: rawIds.size,
    conformedCount: conformedIds.size,
    matchedCount,
    diffCount: diffIds.size,
    bucketCounts
  }
}

const readTableColumns = async (
  dataset: string,
  table: string
): Promise<Set<string>> => {
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

const ensureRequiredColumn = (columns: Set<string>, column: string, label: string) => {
  if (!columns.has(column)) {
    throw new Error(`${label} is missing required column '${column}'`)
  }
}

const buildParityQueryParams = ({
  spaceId,
  startDate,
  endDate,
  assigneeSourceId
}: {
  spaceId: string
  startDate: string
  endDate: string
  assigneeSourceId: string | null
}) => (
  assigneeSourceId
    ? { spaceId, startDate, endDate, assigneeSourceId }
    : { spaceId, startDate, endDate }
)

const buildRawAssigneeIdsExpression = (columns: Set<string>) => {
  const hasResponsablesIds = columns.has('responsables_ids')
  const hasResponsableIds = columns.has('responsable_ids')

  if (hasResponsablesIds && hasResponsableIds) {
    return `CASE
      WHEN responsables_ids IS NOT NULL AND ARRAY_LENGTH(responsables_ids) > 0 THEN responsables_ids
      WHEN responsable_ids IS NOT NULL AND ARRAY_LENGTH(responsable_ids) > 0 THEN responsable_ids
      ELSE ARRAY<STRING>[]
    END`
  }

  if (hasResponsablesIds) {
    return 'IFNULL(responsables_ids, ARRAY<STRING>[])'
  }

  if (hasResponsableIds) {
    return 'IFNULL(responsable_ids, ARRAY<STRING>[])'
  }

  return 'ARRAY<STRING>[]'
}

const buildRawStatusExpression = (columns: Set<string>) => {
  const hasEstado = columns.has('estado')
  const hasEstado1 = columns.has('estado_1')

  if (hasEstado && hasEstado1) {
    return 'COALESCE(estado, estado_1)'
  }

  if (hasEstado) {
    return 'estado'
  }

  if (hasEstado1) {
    return 'estado_1'
  }

  return 'CAST(NULL AS STRING)'
}

const buildDateExpression = (columnName: string) =>
  `COALESCE(SAFE_CAST(${columnName} AS DATE), DATE(SAFE_CAST(${columnName} AS TIMESTAMP)))`

const normalizeAuditRow = (row: Record<string, unknown>): NotionParityAuditRow => ({
  task_source_id: toTrimmedString(row.task_source_id) ?? '',
  space_id: toTrimmedString(row.space_id) ?? '',
  task_name: normalizeTaskName(row.task_name),
  task_status: toTrimmedString(row.task_status) ?? '',
  due_date: toDateString(row.due_date),
  assignee_source_id: toTrimmedString(row.assignee_source_id),
  tarea_principal_ids: toStringArray(row.tarea_principal_ids),
  subtareas_ids: toStringArray(row.subtareas_ids),
  _synced_at: toTimestampString(row._synced_at) ?? '',
  synced_at: toTimestampString(row.synced_at),
  created_at: toTimestampString(row.created_at),
  page_url: toTrimmedString(row.page_url)
})

const readRawParityRows = async ({
  spaceId,
  startDate,
  endDate,
  assigneeSourceId,
  periodField,
  columns
}: {
  spaceId: string
  startDate: string
  endDate: string
  assigneeSourceId: string | null
  periodField: NotionParityPeriodField
  columns: Set<string>
}): Promise<NotionParityAuditRow[]> => {
  ensureRequiredColumn(columns, 'notion_page_id', 'notion_ops.tareas')
  ensureRequiredColumn(columns, 'space_id', 'notion_ops.tareas')
  ensureRequiredColumn(columns, 'nombre_de_tarea', 'notion_ops.tareas')
  ensureRequiredColumn(columns, 'created_time', 'notion_ops.tareas')

  const rawAssigneeIdsExpression = buildRawAssigneeIdsExpression(columns)
  const rawStatusExpression = buildRawStatusExpression(columns)

  const rawDueDateExpression = columns.has('fecha_límite')
    ? buildDateExpression('`fecha_límite`')
    : 'CAST(NULL AS DATE)'

  const rawCreatedDateExpression = buildDateExpression('created_time')
  const rawPeriodExpression = periodField === 'due_date' ? rawDueDateExpression : rawCreatedDateExpression

  const rawSyncedExpression = columns.has('_synced_at')
    ? 'SAFE_CAST(_synced_at AS TIMESTAMP)'
    : 'SAFE_CAST(created_time AS TIMESTAMP)'

  const parentIdsExpression = columns.has('tarea_principal_ids')
    ? 'IFNULL(tarea_principal_ids, ARRAY<STRING>[])'
    : 'ARRAY<STRING>[]'

  const childIdsExpression = columns.has('subtareas_ids')
    ? 'IFNULL(subtareas_ids, ARRAY<STRING>[])'
    : 'ARRAY<STRING>[]'

  const assigneeFilterClause = assigneeSourceId
    ? `AND @assigneeSourceId IN UNNEST(${rawAssigneeIdsExpression})`
    : ''

  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT
        notion_page_id AS task_source_id,
        space_id,
        nombre_de_tarea AS task_name,
        ${rawStatusExpression} AS task_status,
        ${rawDueDateExpression} AS due_date,
        ${rawAssigneeIdsExpression}[SAFE_OFFSET(0)] AS assignee_source_id,
        ${parentIdsExpression} AS tarea_principal_ids,
        ${childIdsExpression} AS subtareas_ids,
        ${rawSyncedExpression} AS _synced_at,
        SAFE_CAST(created_time AS TIMESTAMP) AS created_at,
        page_url
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE notion_page_id IS NOT NULL
        AND space_id = @spaceId
        AND ${rawPeriodExpression} BETWEEN @startDate AND @endDate
        ${assigneeFilterClause}
    `,
    params: buildParityQueryParams({
      spaceId,
      startDate,
      endDate,
      assigneeSourceId
    })
  }) as [Array<Record<string, unknown>>, unknown]

  return rows.map(normalizeAuditRow)
}

const readConformedParityRows = async ({
  spaceId,
  startDate,
  endDate,
  assigneeSourceId,
  periodField,
  columns
}: {
  spaceId: string
  startDate: string
  endDate: string
  assigneeSourceId: string | null
  periodField: NotionParityPeriodField
  columns: Set<string>
}): Promise<NotionParityAuditRow[]> => {
  ensureRequiredColumn(columns, 'task_source_id', 'greenhouse_conformed.delivery_tasks')
  ensureRequiredColumn(columns, 'space_id', 'greenhouse_conformed.delivery_tasks')
  ensureRequiredColumn(columns, 'task_name', 'greenhouse_conformed.delivery_tasks')
  ensureRequiredColumn(columns, 'synced_at', 'greenhouse_conformed.delivery_tasks')
  ensureRequiredColumn(columns, 'is_deleted', 'greenhouse_conformed.delivery_tasks')

  if (periodField === 'created_at' && !columns.has('created_at')) {
    throw new Error("greenhouse_conformed.delivery_tasks is missing required column 'created_at' for created_at audits")
  }

  const conformedPeriodExpression = periodField === 'due_date'
    ? 'due_date'
    : 'DATE(created_at)'

  const assigneeFilterClause = assigneeSourceId
    ? 'AND assignee_source_id = @assigneeSourceId'
    : ''

  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT
        task_source_id,
        space_id,
        task_name,
        task_status,
        due_date,
        assignee_source_id,
        ARRAY<STRING>[] AS tarea_principal_ids,
        ARRAY<STRING>[] AS subtareas_ids,
        synced_at AS _synced_at,
        synced_at,
        created_at,
        page_url
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE space_id = @spaceId
        AND NOT is_deleted
        AND ${conformedPeriodExpression} BETWEEN @startDate AND @endDate
        ${assigneeFilterClause}
    `,
    params: buildParityQueryParams({
      spaceId,
      startDate,
      endDate,
      assigneeSourceId
    })
  }) as [Array<Record<string, unknown>>, unknown]

  return rows.map(normalizeAuditRow)
}

const readConformedReferenceSyncedAt = async (spaceId: string) => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT MAX(synced_at) AS synced_at
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE space_id = @spaceId
        AND NOT is_deleted
    `,
    params: { spaceId }
  }) as [Array<Record<string, unknown>>, unknown]

  return toTimestampString(rows[0]?.synced_at ?? null)
}

export const auditDeliveryNotionParity = async (
  input: DeliveryNotionParityAuditInput
): Promise<DeliveryNotionParityAuditOutput> => {
  const periodField = input.periodField ?? 'due_date'
  const assigneeSourceId = toTrimmedString(input.assigneeSourceId) ?? null
  const { startDate, endDate } = toMonthWindow(input.year, input.month)

  const sampleLimit = Number.isInteger(input.sampleLimit) && input.sampleLimit && input.sampleLimit > 0
    ? input.sampleLimit
    : 50

  const [rawColumns, conformedColumns, conformedSyncedAt] = await Promise.all([
    readTableColumns('notion_ops', 'tareas'),
    readTableColumns('greenhouse_conformed', 'delivery_tasks'),
    readConformedReferenceSyncedAt(input.spaceId)
  ])

  const [rawRows, conformedRows] = await Promise.all([
    readRawParityRows({
      spaceId: input.spaceId,
      startDate,
      endDate,
      assigneeSourceId,
      periodField,
      columns: rawColumns
    }),
    readConformedParityRows({
      spaceId: input.spaceId,
      startDate,
      endDate,
      assigneeSourceId,
      periodField,
      columns: conformedColumns
    })
  ])

  const buckets = classifyNotionParityAudit({
    rawRows,
    conformedRows,
    conformedSyncedAt,
    sampleLimit
  })

  return {
    spaceId: input.spaceId,
    periodField,
    period: {
      year: input.year,
      month: input.month,
      startDate,
      endDate
    },
    assigneeSourceId,
    conformedSyncedAt,
    summary: summarizeAudit({ rawRows, conformedRows, conformedSyncedAt }),
    buckets
  }
}
