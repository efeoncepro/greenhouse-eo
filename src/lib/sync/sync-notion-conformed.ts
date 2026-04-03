import 'server-only'

import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import {
  getNotionRawFreshnessGate,
  type NotionRawFreshnessGateResult
} from '@/lib/integrations/notion-readiness'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { auditDeliveryNotionParity } from '@/lib/space-notion/notion-parity-audit'
import {
  buildNotionTaskParitySnapshot,
  compareNotionTaskParitySnapshots,
  validateRawToConformedTaskParity
} from '@/lib/sync/notion-task-parity'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SyncConformedResult {
  syncRunId: string
  projectsRead: number
  tasksRead: number
  sprintsRead: number
  conformedRowsWritten: number
  sourceTasksWithResponsables: number
  conformedTasksWithAssigneeSource: number
  conformedTasksWithAssigneeMember: number
  conformedTasksWithAssigneeMemberIds: number
  durationMs: number
  skipped?: boolean
  skipReason?: string | null
  rawFreshness?: NotionRawFreshnessGateResult | null
}

type SyncConformedRunStatus = 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'

type InformationSchemaRow = {
  column_name: string
}

type PersistedDistinctTaskCountRow = {
  distinct_task_count: number | string | null
}

type PersistedSpaceTotalsRow = {
  space_id: string | null
  total_tasks: number | string | null
  with_assignee_source: number | string | null
  with_due_date: number | string | null
  with_hierarchy: number | string | null
}

type PersistedStatusCountsRow = {
  space_id: string | null
  task_status: string | null
  total_tasks: number | string | null
}

type BigQueryTimestampRow = {
  max_synced_at: { value?: string } | string | null
}

type NotionProjectRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  space_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_del_proyecto: string | null
  resumen: string | null
  estado: string | null
  'finalización': string | null
  pct_on_time: string | null
  prioridad: string | null
  rpa_promedio: string | null
  fechas: string | null
  fechas_end: string | null
  page_url: string | null
  propietario_ids: string[] | null
  business_unit: string | null
}

type NotionTaskRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  space_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_de_tarea: string | null
  estado: string | null
  prioridad: string | null
  'priorización': string | null
  completitud: string | null
  cumplimiento: string | null
  'días_de_retraso': string | null
  'días_reprogramados': string | null
  reprogramada: string | null
  indicador_de_performance: string | null
  client_change_round: string | null
  client_change_round_final: string | null
  rpa: string | null
  'semáforo_rpa': string | null
  frame_versions: string | null
  frame_comments: string | null
  open_frame_comments: string | null
  client_review_open: boolean | null
  workflow_review_open: boolean | null
  bloqueado_por_ids: string[] | null
  last_frame_comment: string | null
  proyecto_ids: string[] | null
  sprint_ids: string[] | null
  responsables_ids: string[] | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
  'fecha_límite': string | null
  'fecha_límite_end': string | null
  'fecha_límite_original': string | null
  'fecha_límite_original_end': string | null
  fecha_de_completado: string | null
  'tiempo_de_ejecución': string | null
  'tiempo_en_cambios': string | null
  'tiempo_en_revisión': string | null
  workflow_change_round: string | null
  page_url: string | null
}

type NotionSprintRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  space_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_del_sprint: string | null
  estado_del_sprint: string | null
  fechas: string | null
  fechas_end: string | null
  tareas_completadas: string | null
  total_de_tareas: string | null
  page_url: string | null
}

// ─── Helpers (pure functions, mirrored from sync script) ────────────────────

/** Normalize Notion Business Unit label → canonical module_code. */
const BUSINESS_UNIT_LABEL_MAP: Record<string, string> = {
  globe: 'globe',
  'efeonce digital': 'efeonce_digital',
  reach: 'reach',
  wave: 'wave',
  'crm solutions': 'crm_solutions'
}

const normalizeBusinessUnit = (value: unknown): string | null => {
  const raw = toNullableString(value)

  if (!raw) return null

  return BUSINESS_UNIT_LABEL_MAP[raw.toLowerCase().trim()] || raw.toLowerCase().replace(/\s+/g, '_')
}

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const t = value.trim()

    return t || null
  }

  if (typeof value === 'object' && value && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  return String(value)
}

const toNumber = (value: unknown) => {
  const s = toNullableString(value)

  if (!s) return null

  const n = Number(s.replace(/,/g, ''))

  return Number.isFinite(n) ? n : null
}

const toYesNoBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value

  const n = toNullableString(value)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  return n === 'si' || n === 'yes' || n === 'true'
}

const toDateValue = (value: unknown) => {
  const s = toNullableString(value)

  return s ? s.slice(0, 10) : null
}

const toTimestampValue = (value: unknown) => {
  const s = toNullableString(value)

  if (!s) return null

  return s.includes('T') ? s : `${s}T00:00:00.000Z`
}

const normalizePerformanceIndicatorCode = (value: unknown) => {
  const n = toNullableString(value)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  if (!n || n === '—' || n === '-') return null
  if (n.includes('on-time') || n.includes('on time')) return 'on_time'
  if (n.includes('late drop')) return 'late_drop'
  if (n.includes('overdue')) return 'overdue'
  if (n.includes('carry-over') || n.includes('carry over')) return 'carry_over'

  return null
}

const buildPayloadHash = (payload: unknown) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(value.map(item => toNullableString(item)).filter((item): item is string => Boolean(item)))
  )
}

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

  if (hasResponsablesIds) return 'IFNULL(responsables_ids, ARRAY<STRING>[])'
  if (hasResponsableIds) return 'IFNULL(responsable_ids, ARRAY<STRING>[])'

  return 'ARRAY<STRING>[]'
}

const buildRawStatusExpression = (columns: Set<string>) => {
  const hasEstado = columns.has('estado')
  const hasEstado1 = columns.has('estado_1')

  if (hasEstado && hasEstado1) return 'COALESCE(estado, estado_1)'
  if (hasEstado) return 'estado'
  if (hasEstado1) return 'estado_1'

  return 'CAST(NULL AS STRING)'
}

const buildRawTaskNameExpression = (columns: Set<string>) => {
  const hasNombreDeTarea = columns.has('nombre_de_tarea')
  const hasNombreDeLaTarea = columns.has('nombre_de_la_tarea')

  if (hasNombreDeTarea && hasNombreDeLaTarea) return 'COALESCE(nombre_de_tarea, nombre_de_la_tarea)'
  if (hasNombreDeTarea) return 'nombre_de_tarea'
  if (hasNombreDeLaTarea) return 'nombre_de_la_tarea'

  return 'CAST(NULL AS STRING)'
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

const currentUtcPeriod = () => {
  const now = new Date()

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1
  }
}

const readPersistedNotionTaskParitySnapshot = async (projectId: string) => {
  const bq = getBigQueryClient()

  const [distinctRows, spaceRows, statusRows] = await Promise.all([
    bq.query({
      query: `
        SELECT COUNT(DISTINCT task_source_id) AS distinct_task_count
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      `
    }) as Promise<[PersistedDistinctTaskCountRow[], unknown]>,
    bq.query({
      query: `
        SELECT
          COALESCE(space_id, '__NULL__') AS space_id,
          COUNT(*) AS total_tasks,
          COUNTIF(assignee_source_id IS NOT NULL) AS with_assignee_source,
          COUNTIF(due_date IS NOT NULL) AS with_due_date,
          COUNTIF(
            (tarea_principal_ids IS NOT NULL AND ARRAY_LENGTH(tarea_principal_ids) > 0) OR
            (subtareas_ids IS NOT NULL AND ARRAY_LENGTH(subtareas_ids) > 0)
          ) AS with_hierarchy
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
        GROUP BY COALESCE(space_id, '__NULL__')
      `
    }) as Promise<[PersistedSpaceTotalsRow[], unknown]>,
    bq.query({
      query: `
        SELECT
          COALESCE(space_id, '__NULL__') AS space_id,
          COALESCE(task_status, '__NULL__') AS task_status,
          COUNT(*) AS total_tasks
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
        GROUP BY COALESCE(space_id, '__NULL__'), COALESCE(task_status, '__NULL__')
      `
    }) as Promise<[PersistedStatusCountsRow[], unknown]>
  ])

  const [distinctTaskCountRows] = distinctRows
  const [persistedSpaceRows] = spaceRows
  const [persistedStatusRows] = statusRows

  return {
    distinctTaskCount: toNumber(distinctTaskCountRows[0]?.distinct_task_count ?? 0) ?? 0,
    spaceTotals: Object.fromEntries(
      persistedSpaceRows.map(row => [
        row.space_id ?? '__NULL__',
        {
          totalTasks: toNumber(row.total_tasks) ?? 0,
          withAssigneeSource: toNumber(row.with_assignee_source) ?? 0,
          withDueDate: toNumber(row.with_due_date) ?? 0,
          withHierarchy: toNumber(row.with_hierarchy) ?? 0
        }
      ])
    ),
    statusCounts: persistedStatusRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      const spaceKey = row.space_id ?? '__NULL__'
      const statusKey = row.task_status ?? '__NULL__'

      if (!acc[spaceKey]) {
        acc[spaceKey] = {}
      }

      acc[spaceKey][statusKey] = toNumber(row.total_tasks) ?? 0

      return acc
    }, {})
  }
}

// ─── BigQuery Runners ───────────────────────────────────────────────────────

const runBigQuery = async <T extends Record<string, unknown>>(query: string) => {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({ query })

  return rows as T[]
}

const buildStagingTableName = (table: string) =>
  `${table}__stage_${randomUUID().replace(/-/g, '_').toLowerCase()}`

const createEmptyStagingTable = async ({
  projectId,
  dataset,
  targetTable,
  stagingTable
}: {
  projectId: string
  dataset: string
  targetTable: string
  stagingTable: string
}) => {
  const bq = getBigQueryClient()

  await bq.query({
    query: `
      CREATE TABLE \`${projectId}.${dataset}.${stagingTable}\`
      AS SELECT *
      FROM \`${projectId}.${dataset}.${targetTable}\`
      WHERE FALSE
    `
  })
}

const loadRowsIntoBigQueryTable = async ({
  dataset,
  table,
  rows
}: {
  dataset: string
  table: string
  rows: Record<string, unknown>[]
}) => {
  if (rows.length === 0) {
    return
  }

  const bq = getBigQueryClient()
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `greenhouse-bq-${table}-`))
  const tempFilePath = path.join(tempDir, `${table}.jsonl`)

  try {
    const jsonLines = rows.map(row => JSON.stringify(row)).join('\n')

    await writeFile(tempFilePath, `${jsonLines}\n`, 'utf8')
    await bq.dataset(dataset).table(table).load(tempFilePath, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_APPEND'
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const dropBigQueryTable = async ({
  projectId,
  dataset,
  table
}: {
  projectId: string
  dataset: string
  table: string
}) => {
  const bq = getBigQueryClient()

  await bq.query({
    query: `DROP TABLE IF EXISTS \`${projectId}.${dataset}.${table}\``
  })
}

const replaceBigQueryTablesWithStagedSwap = async ({
  projectId,
  dataset,
  replacements
}: {
  projectId: string
  dataset: string
  replacements: Array<{
    table: string
    rows: Record<string, unknown>[]
  }>
}) => {
  const bq = getBigQueryClient()
  const stagedTables: Array<{ targetTable: string; stagingTable: string }> = []

  try {
    for (const replacement of replacements) {
      const stagingTable = buildStagingTableName(replacement.table)

      await createEmptyStagingTable({
        projectId,
        dataset,
        targetTable: replacement.table,
        stagingTable
      })
      await loadRowsIntoBigQueryTable({
        dataset,
        table: stagingTable,
        rows: replacement.rows
      })

      stagedTables.push({
        targetTable: replacement.table,
        stagingTable
      })
    }

    const script = [
      'BEGIN TRANSACTION;',
      ...stagedTables.flatMap(({ targetTable, stagingTable }) => [
        `DELETE FROM \`${projectId}.${dataset}.${targetTable}\` WHERE TRUE;`,
        `INSERT INTO \`${projectId}.${dataset}.${targetTable}\` SELECT * FROM \`${projectId}.${dataset}.${stagingTable}\`;`
      ]),
      'COMMIT TRANSACTION;'
    ].join('\n')

    await bq.query({
      query: script
    })
  } finally {
    for (const stagedTable of stagedTables) {
      await dropBigQueryTable({
        projectId,
        dataset,
        table: stagedTable.stagingTable
      }).catch(() => {})
    }
  }
}

const readRawConformedFreshness = async (projectId: string) => {
  const bq = getBigQueryClient()

  const [[rawRows], [conformedRows]] = await Promise.all([
    bq.query({
      query: `
        SELECT MAX(_synced_at) AS max_synced_at
        FROM \`${projectId}.notion_ops.tareas\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>,
    bq.query({
      query: `
        SELECT MAX(synced_at) AS max_synced_at
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>
  ])

  const [[rawProjectRows], [conformedProjectRows]] = await Promise.all([
    bq.query({
      query: `
        SELECT MAX(_synced_at) AS max_synced_at
        FROM \`${projectId}.notion_ops.proyectos\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>,
    bq.query({
      query: `
        SELECT MAX(synced_at) AS max_synced_at
        FROM \`${projectId}.greenhouse_conformed.delivery_projects\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>
  ])

  const [[rawSprintRows], [conformedSprintRows]] = await Promise.all([
    bq.query({
      query: `
        SELECT MAX(_synced_at) AS max_synced_at
        FROM \`${projectId}.notion_ops.sprints\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>,
    bq.query({
      query: `
        SELECT MAX(synced_at) AS max_synced_at
        FROM \`${projectId}.greenhouse_conformed.delivery_sprints\`
      `
    }) as Promise<[BigQueryTimestampRow[], unknown]>
  ])

  return {
    raw: {
      tasks: toTimestampValue(rawRows[0]?.max_synced_at),
      projects: toTimestampValue(rawProjectRows[0]?.max_synced_at),
      sprints: toTimestampValue(rawSprintRows[0]?.max_synced_at)
    },
    conformed: {
      tasks: toTimestampValue(conformedRows[0]?.max_synced_at),
      projects: toTimestampValue(conformedProjectRows[0]?.max_synced_at),
      sprints: toTimestampValue(conformedSprintRows[0]?.max_synced_at)
    }
  }
}

const isConformedTableFreshEnough = (rawSyncedAt: string | null, conformedSyncedAt: string | null) => {
  if (!rawSyncedAt) return true
  if (!conformedSyncedAt) return false

  return new Date(conformedSyncedAt).getTime() >= new Date(rawSyncedAt).getTime()
}

const isConformedFreshEnough = (freshness: Awaited<ReturnType<typeof readRawConformedFreshness>>) =>
  isConformedTableFreshEnough(freshness.raw.tasks, freshness.conformed.tasks) &&
  isConformedTableFreshEnough(freshness.raw.projects, freshness.conformed.projects) &&
  isConformedTableFreshEnough(freshness.raw.sprints, freshness.conformed.sprints)

const formatFreshnessSnapshot = (freshness: Awaited<ReturnType<typeof readRawConformedFreshness>>) =>
  JSON.stringify({
    raw: freshness.raw,
    conformed: freshness.conformed
  })

/** Ensure delivery_tasks has additive columns required by the sync runtime. */
const ensureDeliveryTaskColumns = async (projectId: string) => {
  const bq = getBigQueryClient()
  const existingColumns = await readTableColumns('greenhouse_conformed', 'delivery_tasks')
  const missingColumns: Array<{ name: string; type: string }> = []

  if (!existingColumns.has('assignee_member_ids')) {
    missingColumns.push({ name: 'assignee_member_ids', type: 'ARRAY<STRING>' })
  }

  if (!existingColumns.has('project_source_ids')) {
    missingColumns.push({ name: 'project_source_ids', type: 'ARRAY<STRING>' })
  }

  if (!existingColumns.has('created_at')) {
    missingColumns.push({ name: 'created_at', type: 'TIMESTAMP' })
  }

  if (!existingColumns.has('tarea_principal_ids')) {
    missingColumns.push({ name: 'tarea_principal_ids', type: 'ARRAY<STRING>' })
  }

  if (!existingColumns.has('subtareas_ids')) {
    missingColumns.push({ name: 'subtareas_ids', type: 'ARRAY<STRING>' })
  }

  for (const column of missingColumns) {
    try {
      await bq.query({
        query: `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN ${column.name} ${column.type}`
      })
    } catch {
      // Column may have been added concurrently or service account lacks ALTER permissions — safe to continue
    }
  }
}

export const writeSyncConformedRunRecord = async ({
  syncRunId,
  status,
  notes,
  recordsRead = 0,
  recordsWrittenConformed = 0
}: {
  syncRunId: string
  status: SyncConformedRunStatus
  notes?: string | null
  recordsRead?: number
  recordsWrittenConformed?: number
}) => {
  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.source_sync_runs
        (sync_run_id, source_system, source_object_type, sync_mode, status,
         records_read, records_written_conformed, triggered_by, notes, finished_at)
       VALUES ($1, 'notion', 'cron_conformed', 'incremental', $2,
               $3, $4, 'vercel_cron', $5, CASE WHEN $2 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
       ON CONFLICT (sync_run_id) DO UPDATE
       SET
         status = EXCLUDED.status,
         records_read = EXCLUDED.records_read,
         records_written_conformed = EXCLUDED.records_written_conformed,
         notes = EXCLUDED.notes,
         finished_at = EXCLUDED.finished_at`,
      [syncRunId, status, recordsRead, recordsWrittenConformed, notes ?? null]
    )
  } catch {
    // Non-critical control-plane write
  }
}

// ─── Main Sync Function ─────────────────────────────────────────────────────

export const syncNotionToConformed = async (input?: {
  rawFreshness?: NotionRawFreshnessGateResult
  syncRunId?: string
}): Promise<SyncConformedResult> => {
  const start = Date.now()
  const syncRunId = input?.syncRunId ?? `sync-cron-${randomUUID()}`
  const projectId = getBigQueryProjectId()
  const nowIso = new Date().toISOString()
  const { year: auditYear, month: auditMonth } = currentUtcPeriod()

  await writeSyncConformedRunRecord({
    syncRunId,
    status: 'running',
    notes: 'Conformed sync started.'
  })

  try {
    const rawFreshness = input?.rawFreshness ?? await getNotionRawFreshnessGate()

    if (!rawFreshness.ready) {
      await writeSyncConformedRunRecord({
        syncRunId,
        status: 'cancelled',
        notes: `Conformed sync skipped: ${rawFreshness.reason}`
      })

      return {
        syncRunId,
        projectsRead: 0,
        tasksRead: 0,
        sprintsRead: 0,
        conformedRowsWritten: 0,
        sourceTasksWithResponsables: 0,
        conformedTasksWithAssigneeSource: 0,
        conformedTasksWithAssigneeMember: 0,
        conformedTasksWithAssigneeMemberIds: 0,
        durationMs: Date.now() - start,
        skipped: true,
        skipReason: rawFreshness.reason,
        rawFreshness
      }
    }

    const freshnessSnapshot = await readRawConformedFreshness(projectId)

    if (isConformedFreshEnough(freshnessSnapshot)) {
      const notes =
        `Conformed sync already current for raw snapshot; write skipped. freshness=${formatFreshnessSnapshot(freshnessSnapshot)}`

      await writeSyncConformedRunRecord({
        syncRunId,
        status: 'succeeded',
        notes,
        recordsRead: 0,
        recordsWrittenConformed: 0
      })

      return {
        syncRunId,
        projectsRead: 0,
        tasksRead: 0,
        sprintsRead: 0,
        conformedRowsWritten: 0,
        sourceTasksWithResponsables: 0,
        conformedTasksWithAssigneeSource: 0,
        conformedTasksWithAssigneeMember: 0,
        conformedTasksWithAssigneeMemberIds: 0,
        durationMs: Date.now() - start,
        rawFreshness
      }
    }

    const taskColumns = await readTableColumns('notion_ops', 'tareas')
    const rawTaskNameExpression = buildRawTaskNameExpression(taskColumns)
    const rawTaskStatusExpression = buildRawStatusExpression(taskColumns)
    const rawAssigneeIdsExpression = buildRawAssigneeIdsExpression(taskColumns)

    const parentIdsExpression = taskColumns.has('tarea_principal_ids')
      ? 'IFNULL(tarea_principal_ids, ARRAY<STRING>[])'
      : 'ARRAY<STRING>[]'

    const childIdsExpression = taskColumns.has('subtareas_ids')
      ? 'IFNULL(subtareas_ids, ARRAY<STRING>[])'
      : 'ARRAY<STRING>[]'

    // 1. Read from notion_ops (populated by external notion-bq-sync Cloud Run)
    const [projects, tasks, sprints] = await Promise.all([
    runBigQuery<NotionProjectRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             nombre_del_proyecto, resumen, estado, \`finalización\`, pct_on_time,
             prioridad, rpa_promedio, fechas, fechas_end, page_url, propietario_ids,
             business_unit
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id IS NOT NULL
    `),
    runBigQuery<NotionTaskRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             ${rawTaskNameExpression} AS nombre_de_tarea,
             ${rawTaskStatusExpression} AS estado,
             prioridad, \`priorización\`, completitud,
             cumplimiento, \`días_de_retraso\`, \`días_reprogramados\`, reprogramada,
             indicador_de_performance, client_change_round,
             COALESCE(CAST(client_change_round_final AS STRING), CAST(cantidad_de_correcciones AS STRING)) AS client_change_round_final,
             COALESCE(CAST(rpa AS STRING), CAST(rondas AS STRING)) AS rpa,
             COALESCE(CAST(\`semáforo_rpa\` AS STRING), CAST(\`semáforo_rondas\` AS STRING)) AS \`semáforo_rpa\`,
             frame_versions, frame_comments, open_frame_comments,
             client_review_open, workflow_review_open, bloqueado_por_ids,
             last_frame_comment, proyecto_ids, sprint_ids,
             ${rawAssigneeIdsExpression} AS responsables_ids,
             ${parentIdsExpression} AS tarea_principal_ids,
             ${childIdsExpression} AS subtareas_ids,
             \`fecha_límite\`, \`fecha_límite_end\`, \`fecha_límite_original\`,
             \`fecha_límite_original_end\`, fecha_de_completado,
             \`tiempo_de_ejecución\`, \`tiempo_en_cambios\`, \`tiempo_en_revisión\`,
             workflow_change_round, page_url
      FROM \`${projectId}.notion_ops.tareas\`
      WHERE notion_page_id IS NOT NULL
    `),
    runBigQuery<NotionSprintRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             nombre_del_sprint, estado_del_sprint, fechas, fechas_end,
             tareas_completadas, total_de_tareas, page_url
      FROM \`${projectId}.notion_ops.sprints\`
      WHERE notion_page_id IS NOT NULL
    `)
    ])

  const sourceTasksWithResponsables = tasks.reduce((count, row) => (
    count + ((row.responsables_ids?.length ?? 0) > 0 ? 1 : 0)
  ), 0)

  // 2. Resolve client_id via space_notion_sources (space_id comes from raw data)
  //    Cloud Run v3.0 stamps every row with space_id, so we use it directly.
  //    PostgreSQL lookup is only needed to resolve space_id → client_id.
  const spaceClientMap = new Map<string, string | null>()

  try {
    const spaceNotionSources = await runGreenhousePostgresQuery<{
      space_id: string
      client_id: string | null
    }>(
      `SELECT sns.space_id, s.client_id
       FROM greenhouse_core.space_notion_sources sns
       JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
       WHERE sns.sync_enabled = TRUE`
    )

    for (const src of spaceNotionSources) {
      spaceClientMap.set(src.space_id, src.client_id)
    }
  } catch (err) {
    console.warn('[sync-cron] Could not load space_notion_sources from PostgreSQL — client_id will be null:', err instanceof Error ? err.message : err)
  }

  // Resolve team members for assignee mapping
  const memberRows = await runBigQuery<{ member_id: string | null; notion_user_id: string | null }>(`
    SELECT member_id, notion_user_id
    FROM \`${projectId}.greenhouse.team_members\`
    WHERE notion_user_id IS NOT NULL
  `)

  const notionMemberMap = new Map(
    memberRows
      .map(r => [toNullableString(r.notion_user_id), toNullableString(r.member_id)] as const)
      .filter(([uid, mid]) => uid && mid)
  )

  // 3. Transform projects
  const deliveryProjects = projects.map(row => {
    const projectSourceId = toNullableString(row.notion_page_id)
    const projectDatabaseSourceId = toNullableString(row._source_database_id)
    const spaceId = toNullableString(row.space_id)
    const clientId = spaceId ? (spaceClientMap.get(spaceId) ?? null) : null
    const ownerSourceId = row.propietario_ids?.[0] || null

    return {
      project_source_id: projectSourceId,
      project_database_source_id: projectDatabaseSourceId,
      space_id: spaceId,
      client_source_id: projectDatabaseSourceId,
      client_id: clientId,
      module_code: null as string | null,
      module_id: null as string | null,
      project_name: toNullableString(row.nombre_del_proyecto) || 'Sin nombre',
      project_status: toNullableString(row.estado),
      project_summary: toNullableString(row.resumen),
      completion_label: toNullableString(row['finalización']),
      on_time_pct_source: toNumber(row.pct_on_time),
      avg_rpa_source: toNumber(row.rpa_promedio),
      project_phase: null as string | null,
      owner_source_id: ownerSourceId,
      owner_member_id: ownerSourceId ? (notionMemberMap.get(ownerSourceId) || null) : null,
      start_date: toDateValue(row.fechas),
      end_date: toDateValue(row.fechas_end),
      operating_business_unit: normalizeBusinessUnit(row.business_unit),
      page_url: toNullableString(row.page_url),
      last_edited_time: toTimestampValue(row.last_edited_time),
      payload_hash: buildPayloadHash(row),
      is_deleted: false,
      sync_run_id: syncRunId,
      synced_at: nowIso
    }
  })

  // Build project → space/client maps for task resolution
  const projectSpaceMap = new Map(
    deliveryProjects.map(p => [p.project_source_id, p.space_id] as const).filter(([id]) => Boolean(id))
  )

  const projectClientMap = new Map(
    deliveryProjects.map(p => [p.project_source_id, p.client_id] as const).filter(([id]) => Boolean(id))
  )

  const projectDatabaseSourceMap = new Map(
    deliveryProjects.map(p => [p.project_source_id, p.project_database_source_id] as const).filter(([id]) => Boolean(id))
  )

  // 4. Transform tasks
  const deliveryTasks = tasks.map(row => {
    const projectSourceIds = Array.from(
      new Set((row.proyecto_ids || []).map(id => toNullableString(id)).filter((id): id is string => !!id))
    )

    const projectSourceId = projectSourceIds[0] || null
    const sprintSourceId = row.sprint_ids?.[0] || null
    const assigneeSourceId = row.responsables_ids?.[0] || null

    const assigneeMemberIds = (row.responsables_ids || [])
      .map((id: string) => notionMemberMap.get(id))
      .filter((mid): mid is string => !!mid)

    const projectDatabaseSourceId =
      (projectSourceId ? projectDatabaseSourceMap.get(projectSourceId) || null : null) ||
      toNullableString(row._source_database_id)

    const spaceId = (projectSourceId ? (projectSpaceMap.get(projectSourceId) || null) : null) || toNullableString(row.space_id)
    const clientId = spaceId ? (projectSourceId ? (projectClientMap.get(projectSourceId) || null) : null) || (spaceClientMap.get(spaceId) ?? null) : null
    const parentTaskSourceIds = toStringArray(row.tarea_principal_ids)
    const subtaskSourceIds = toStringArray(row.subtareas_ids)

    return {
      task_source_id: toNullableString(row.notion_page_id),
      project_source_id: projectSourceId,
      project_source_ids: projectSourceIds.length > 0 ? projectSourceIds : null,
      sprint_source_id: sprintSourceId,
      project_database_source_id: projectDatabaseSourceId,
      space_id: spaceId,
      client_source_id: projectDatabaseSourceId,
      client_id: clientId,
      module_code: null as string | null,
      module_id: null as string | null,
      task_name: toNullableString(row.nombre_de_tarea) || 'Sin nombre',
      task_status: toNullableString(row.estado),
      task_phase: toNullableString(row['priorización']),
      task_priority: toNullableString(row.prioridad),
      assignee_source_id: assigneeSourceId,
      assignee_member_id: assigneeSourceId ? (notionMemberMap.get(assigneeSourceId) || null) : null,
      assignee_member_ids: assigneeMemberIds.length > 0 ? assigneeMemberIds : null,
      completion_label: toNullableString(row.completitud),
      delivery_compliance: toNullableString(row.cumplimiento),
      days_late: toNumber(row['días_de_retraso']),
      rescheduled_days: toNumber(row['días_reprogramados']),
      is_rescheduled: toYesNoBoolean(row.reprogramada),
      performance_indicator_label: toNullableString(row.indicador_de_performance),
      performance_indicator_code: normalizePerformanceIndicatorCode(row.indicador_de_performance),
      client_change_round_label: toNullableString(row.client_change_round),
      client_change_round_final: toNumber(row.client_change_round_final),
      rpa_semaphore_source: toNullableString(row['semáforo_rpa']),
      rpa_value: toNumber(row.rpa),
      frame_versions: toNumber(row.frame_versions),
      frame_comments: toNumber(row.frame_comments),
      open_frame_comments: toNumber(row.open_frame_comments),
      client_review_open: Boolean(row.client_review_open),
      workflow_review_open: Boolean(row.workflow_review_open),
      blocker_count: row.bloqueado_por_ids?.length || 0,
      last_frame_comment: toNullableString(row.last_frame_comment),
      tarea_principal_ids: parentTaskSourceIds.length > 0 ? parentTaskSourceIds : null,
      subtareas_ids: subtaskSourceIds.length > 0 ? subtaskSourceIds : null,
      original_due_date: toDateValue(row['fecha_límite_original_end']) || toDateValue(row['fecha_límite_original']),
      execution_time_label: toNullableString(row['tiempo_de_ejecución']),
      changes_time_label: toNullableString(row['tiempo_en_cambios']),
      review_time_label: toNullableString(row['tiempo_en_revisión']),
      workflow_change_round: toNumber(row.workflow_change_round),
      due_date: toDateValue(row['fecha_límite_end']) || toDateValue(row['fecha_límite']),
      completed_at: toTimestampValue(row.fecha_de_completado),
      page_url: toNullableString(row.page_url),
      last_edited_time: toTimestampValue(row.last_edited_time),
      payload_hash: buildPayloadHash(row),
      is_deleted: false,
      sync_run_id: syncRunId,
      synced_at: nowIso,
      created_at: toTimestampValue(row.created_time)
    }
  })

  const parityValidation = validateRawToConformedTaskParity({
    rawRows: tasks.map(row => ({
      task_source_id: toNullableString(row.notion_page_id),
      space_id: toNullableString(row.space_id),
      task_status: toNullableString(row.estado),
      due_date: toDateValue(row['fecha_límite_end']) || toDateValue(row['fecha_límite']),
      assignee_source_id: row.responsables_ids?.[0] ?? null,
      tarea_principal_ids: toStringArray(row.tarea_principal_ids),
      subtareas_ids: toStringArray(row.subtareas_ids)
    })),
    conformedRows: deliveryTasks.map(row => ({
      task_source_id: row.task_source_id,
      space_id: row.space_id,
      task_status: row.task_status,
      due_date: row.due_date,
      assignee_source_id: row.assignee_source_id,
      tarea_principal_ids: row.tarea_principal_ids,
      subtareas_ids: row.subtareas_ids
    }))
  })

  if (!parityValidation.ok) {
    const firstFailingSpace = parityValidation.failingSpaces[0]
    let auditHint = ''

    if (firstFailingSpace?.spaceId) {
      try {
        const audit = await auditDeliveryNotionParity({
          spaceId: firstFailingSpace.spaceId,
          year: auditYear,
          month: auditMonth,
          periodField: 'due_date',
          sampleLimit: 5
        })

        auditHint = ` runtime_audit=${JSON.stringify({
          spaceId: firstFailingSpace.spaceId,
          rawCount: audit.summary.rawCount,
          conformedCount: audit.summary.conformedCount,
          bucketCounts: audit.summary.bucketCounts
        })}`
      } catch (auditError) {
        auditHint = ` runtime_audit_error=${auditError instanceof Error ? auditError.message : 'unknown'}`
      }
    }

    throw new Error(
      `Conformed sync parity validation failed: ${JSON.stringify(parityValidation.failingSpaces)}${auditHint}`
    )
  }

  // 5. Transform sprints
  const sprintProjectMap = new Map(
    deliveryTasks.map(t => [t.sprint_source_id, t.project_source_id] as const).filter(([s, p]) => Boolean(s) && Boolean(p))
  )

  const sprintSpaceMap = new Map(
    deliveryTasks.map(t => [t.sprint_source_id, t.space_id] as const).filter(([s, sp]) => Boolean(s) && Boolean(sp))
  )

  const deliverySprints = sprints.map(row => {
    const sprintSourceId = toNullableString(row.notion_page_id)
    const spaceId = (sprintSourceId ? (sprintSpaceMap.get(sprintSourceId) || null) : null) || toNullableString(row.space_id)
    const completedTasks = toNumber(row.tareas_completadas)
    const totalTasks = toNumber(row.total_de_tareas)

    return {
      sprint_source_id: sprintSourceId,
      project_source_id: sprintSourceId ? (sprintProjectMap.get(sprintSourceId) || null) : null,
      project_database_source_id: null as string | null,
      space_id: spaceId,
      sprint_name: toNullableString(row.nombre_del_sprint) || 'Sin nombre',
      sprint_status: toNullableString(row.estado_del_sprint),
      start_date: toDateValue(row.fechas),
      end_date: toDateValue(row.fechas_end),
      completed_tasks_count: completedTasks,
      total_tasks_count: totalTasks,
      completion_pct_source: totalTasks && totalTasks > 0 ? Math.round(((completedTasks ?? 0) / totalTasks) * 100) : null,
      page_url: toNullableString(row.page_url),
      last_edited_time: toTimestampValue(row.last_edited_time),
      payload_hash: buildPayloadHash(row),
      is_deleted: false,
      sync_run_id: syncRunId,
      synced_at: nowIso
    }
  })

  // 6. Write to conformed layer (safe DELETE pattern)
  if (deliveryTasks.length === 0) {
    console.warn('[sync-cron] No delivery tasks found — skipping conformed write to preserve existing data')

    await writeSyncConformedRunRecord({
      syncRunId,
      status: 'cancelled',
      notes: 'No delivery tasks found in notion_ops.tareas; conformed write skipped.',
      recordsRead: tasks.length,
      recordsWrittenConformed: 0
    })

    return {
      syncRunId,
      projectsRead: projects.length,
      tasksRead: tasks.length,
      sprintsRead: sprints.length,
      conformedRowsWritten: 0,
      sourceTasksWithResponsables,
      conformedTasksWithAssigneeSource: 0,
      conformedTasksWithAssigneeMember: 0,
      conformedTasksWithAssigneeMemberIds: 0,
      durationMs: Date.now() - start,
      skipped: true,
      skipReason: 'No delivery tasks found in notion_ops.tareas; conformed write skipped.',
      rawFreshness
    }
  }

  await ensureDeliveryTaskColumns(projectId)

  // Stage into unique tables, then atomically swap into the canonical tables.
  // This avoids partial writes if one replacement fails mid-run and reduces
  // repeated table-update pressure on the canonical targets.
  await replaceBigQueryTablesWithStagedSwap({
    projectId,
    dataset: 'greenhouse_conformed',
    replacements: [
      { table: 'delivery_projects', rows: deliveryProjects },
      { table: 'delivery_tasks', rows: deliveryTasks },
      { table: 'delivery_sprints', rows: deliverySprints }
    ]
  })

  const conformedRowsWritten = deliveryProjects.length + deliveryTasks.length + deliverySprints.length

  const bq = getBigQueryClient()

  const [validationRows] = await bq.query({
    query: `
      SELECT
        COALESCE(space_id, '__NULL__') AS space_id,
        COUNTIF(assignee_source_id IS NOT NULL) AS with_assignee_source,
        COUNTIF(assignee_member_id IS NOT NULL) AS with_assignee_member,
        COUNTIF(assignee_member_ids IS NOT NULL AND ARRAY_LENGTH(assignee_member_ids) > 0) AS with_assignee_member_ids
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      GROUP BY COALESCE(space_id, '__NULL__')
      ORDER BY space_id
    `
  })

  const conformedTasksWithAssigneeSource = toNumber(validationRows.reduce((sum, row) => sum + (toNumber(row.with_assignee_source) ?? 0), 0)) ?? 0
  const conformedTasksWithAssigneeMember = toNumber(validationRows.reduce((sum, row) => sum + (toNumber(row.with_assignee_member) ?? 0), 0)) ?? 0
  const conformedTasksWithAssigneeMemberIds = toNumber(validationRows.reduce((sum, row) => sum + (toNumber(row.with_assignee_member_ids) ?? 0), 0)) ?? 0

  const sourceAssigneeCountsBySpace = new Map<string, number>()

  for (const row of tasks) {
    const spaceId = toNullableString(row.space_id) || '__NULL__'
    const hasResponsables = (row.responsables_ids?.length ?? 0) > 0

    if (hasResponsables) {
      sourceAssigneeCountsBySpace.set(spaceId, (sourceAssigneeCountsBySpace.get(spaceId) ?? 0) + 1)
    }
  }

  const conformedAssigneeCountsBySpace = new Map<string, number>()

  for (const row of validationRows) {
    const spaceId = toNullableString(row.space_id) || '__NULL__'

    conformedAssigneeCountsBySpace.set(spaceId, toNumber(row.with_assignee_source) ?? 0)
  }

  for (const [spaceId, sourceCount] of sourceAssigneeCountsBySpace.entries()) {
    const conformedCount = conformedAssigneeCountsBySpace.get(spaceId) ?? 0

    if (sourceCount > 0 && conformedCount !== sourceCount) {
      throw new Error(
        `Conformed sync lost task assignee attribution for space ${spaceId}: source has ${sourceCount} tasks with responsables but delivery_tasks persisted ${conformedCount} assignee_source_id rows`
      )
    }
  }

  if (sourceTasksWithResponsables > 0 && conformedTasksWithAssigneeSource === 0) {
    throw new Error(
      `Conformed sync lost task assignee attribution: source has ${sourceTasksWithResponsables} tasks with responsables but delivery_tasks persisted 0 assignee_source_id rows`
    )
  }

  const persistedParitySnapshot = await readPersistedNotionTaskParitySnapshot(projectId)

  const expectedPersistedParitySnapshot = buildNotionTaskParitySnapshot(
    deliveryTasks.map(task => ({
      task_source_id: task.task_source_id,
      space_id: task.space_id,
      task_status: task.task_status,
      due_date: task.due_date,
      assignee_source_id: task.assignee_source_id,
      tarea_principal_ids: task.tarea_principal_ids,
      subtareas_ids: task.subtareas_ids
    }))
  )

  const persistedParityDiff = compareNotionTaskParitySnapshots(expectedPersistedParitySnapshot, persistedParitySnapshot)

  if (persistedParityDiff.length > 0) {
    throw new Error(
      `Persisted conformed parity mismatch: ${persistedParityDiff.slice(0, 8).join('; ')}`
    )
  }

  // 7. Record sync run in PostgreSQL
  await writeSyncConformedRunRecord({
    syncRunId,
    status: 'succeeded',
    notes: `Conformed sync completed with raw freshness + parity validation. raw_signal=${rawFreshness.freshestRawSyncedAt ?? 'unknown'}`,
    recordsRead: projects.length + tasks.length + sprints.length,
    recordsWrittenConformed: conformedRowsWritten
  })

  // Identity reconciliation — non-blocking tail step
  try {
    const { runIdentityReconciliation } = await import('@/lib/identity/reconciliation/reconciliation-service')
    const reconResult = await runIdentityReconciliation({ syncRunId })

    console.log(
      `[sync-conformed] Identity reconciliation: discovered=${reconResult.discoveredCount}, auto_linked=${reconResult.autoLinkedCount}, pending=${reconResult.pendingReviewCount}, no_match=${reconResult.noMatchCount}`
    )
  } catch (err) {
    console.warn('[sync-conformed] Identity reconciliation failed (non-critical):', err)
  }

    return {
      syncRunId,
      projectsRead: projects.length,
      tasksRead: tasks.length,
      sprintsRead: sprints.length,
      conformedRowsWritten,
      sourceTasksWithResponsables,
      conformedTasksWithAssigneeSource,
      conformedTasksWithAssigneeMember,
      conformedTasksWithAssigneeMemberIds,
      durationMs: Date.now() - start,
      skipped: false,
      skipReason: null,
      rawFreshness
    }
  } catch (error) {
    await writeSyncConformedRunRecord({
      syncRunId,
      status: 'failed',
      notes: `Conformed sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })

    throw error
  }
}
