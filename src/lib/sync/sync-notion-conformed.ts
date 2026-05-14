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
import { loadNotionMemberMapPostgresFirst } from '@/lib/identity/reconciliation/notion-member-map'
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

// Construye una expresión SQL que resuelve el título de una fila Notion
// tolerando que la property title tenga distintos nombres por database
// (p. ej. Efeonce usa "Nombre del proyecto" → `nombre_del_proyecto`; Sky
// Airline usa "Project name" → `project_name`). La cascada selecciona la
// primera columna NO-vacía entre los candidatos que realmente existan en
// la tabla raw de BQ. NULLIF(TRIM(...),'') descarta strings en blanco.
export const buildCoalescingTitleExpression = (
  columns: Set<string>,
  candidates: readonly string[]
) => {
  const applicable = candidates.filter(column => columns.has(column))

  if (applicable.length === 0) return 'CAST(NULL AS STRING)'
  if (applicable.length === 1) return `NULLIF(TRIM(\`${applicable[0]}\`), '')`

  return `COALESCE(${applicable.map(column => `NULLIF(TRIM(\`${column}\`), '')`).join(', ')})`
}

export const NOTION_PROJECT_TITLE_CANDIDATES = ['nombre_del_proyecto', 'project_name'] as const
export const NOTION_TASK_TITLE_CANDIDATES = ['nombre_de_tarea', 'nombre_de_la_tarea'] as const
export const NOTION_SPRINT_TITLE_CANDIDATES = ['nombre_del_sprint', 'sprint_name'] as const

const buildRawProjectNameExpression = (columns: Set<string>) =>
  buildCoalescingTitleExpression(columns, NOTION_PROJECT_TITLE_CANDIDATES)

const buildRawTaskNameExpression = (columns: Set<string>) =>
  buildCoalescingTitleExpression(columns, NOTION_TASK_TITLE_CANDIDATES)

const buildRawSprintNameExpression = (columns: Set<string>) =>
  buildCoalescingTitleExpression(columns, NOTION_SPRINT_TITLE_CANDIDATES)

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

const readPersistedNotionTaskParitySnapshot = async (projectId: string, spaceIds?: string[]) => {
  const bq = getBigQueryClient()

  const spaceFilterSql = buildSpaceFilterSql({
    columnName: 'space_id',
    spaceIds
  })

  const [distinctRows, spaceRows, statusRows] = await Promise.all([
    bq.query({
      query: `
        SELECT COUNT(DISTINCT task_source_id) AS distinct_task_count
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
        WHERE TRUE${spaceFilterSql}
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
        WHERE TRUE${spaceFilterSql}
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
        WHERE TRUE${spaceFilterSql}
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

const toSqlStringLiteral = (value: string) => `'${value.replace(/'/g, "\\'")}'`

const buildSpaceFilterSql = ({
  columnName,
  spaceIds
}: {
  columnName: string
  spaceIds?: string[]
}) => {
  if (!spaceIds || spaceIds.length === 0) {
    return ''
  }

  return ` AND ${columnName} IN (${spaceIds.map(toSqlStringLiteral).join(', ')})`
}

const buildPreserveNonReadySpaceSql = (spaceIds: string[]) => {
  if (spaceIds.length === 0) {
    return 'TRUE'
  }

  return `space_id IS NULL OR space_id NOT IN (${spaceIds.map(toSqlStringLiteral).join(', ')})`
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

const createFilteredStagingTable = async ({
  projectId,
  dataset,
  targetTable,
  stagingTable,
  whereSql
}: {
  projectId: string
  dataset: string
  targetTable: string
  stagingTable: string
  whereSql: string
}) => {
  const bq = getBigQueryClient()

  await bq.query({
    query: `
      CREATE TABLE \`${projectId}.${dataset}.${stagingTable}\`
      AS SELECT *
      FROM \`${projectId}.${dataset}.${targetTable}\`
      WHERE ${whereSql}
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
    preserveWhereSql?: string | null
  }>
}) => {
  const bq = getBigQueryClient()

  const stagedTables: Array<{
    targetTable: string
    stagingTable: string
    preservedStagingTable: string | null
  }> = []

  try {
    for (const replacement of replacements) {
      const stagingTable = buildStagingTableName(replacement.table)

      const preservedStagingTable = replacement.preserveWhereSql
        ? buildStagingTableName(`${replacement.table}__preserved`)
        : null

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

      if (preservedStagingTable && replacement.preserveWhereSql) {
        await createFilteredStagingTable({
          projectId,
          dataset,
          targetTable: replacement.table,
          stagingTable: preservedStagingTable,
          whereSql: replacement.preserveWhereSql
        })
      }

      stagedTables.push({
        targetTable: replacement.table,
        stagingTable,
        preservedStagingTable
      })
    }

    const script = [
      'BEGIN TRANSACTION;',
      ...stagedTables.flatMap(({ targetTable, stagingTable, preservedStagingTable }) => [
        `DELETE FROM \`${projectId}.${dataset}.${targetTable}\` WHERE TRUE;`,
        ...(preservedStagingTable
          ? [`INSERT INTO \`${projectId}.${dataset}.${targetTable}\` SELECT * FROM \`${projectId}.${dataset}.${preservedStagingTable}\`;`]
          : []),
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

      if (stagedTable.preservedStagingTable) {
        await dropBigQueryTable({
          projectId,
          dataset,
          table: stagedTable.preservedStagingTable
        }).catch(() => {})
      }
    }
  }
}

const isConformedTableFreshEnough = (rawSyncedAt: string | null, conformedSyncedAt: string | null) => {
  if (!rawSyncedAt) return true
  if (!conformedSyncedAt) return false

  return new Date(conformedSyncedAt).getTime() >= new Date(rawSyncedAt).getTime()
}

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

/**
 * Align BigQuery `delivery_*` title columns with the canonical TASK-588
 * decision: `NULL = título desconocido`, sentinels prohibited.
 *
 * Notion-side reality: a small number of pages legitimately have no title
 * resolvable via the multi-property cascade (e.g. 28 Sky Airline tasks created
 * by a bulk Nexa Insights import on 2026-04-02 that processed pages whose
 * upstream automation didn't set the title property). Postgres
 * `greenhouse_delivery.{projects,tasks,sprints}.{project_name,task_name,sprint_name}`
 * was already made NULLABLE by migration `20260424082917533` plus a CHECK
 * constraint that prohibits sentinel placeholders ('sin nombre', 'untitled', etc.).
 *
 * BigQuery `delivery_*` were left REQUIRED, so a single null-titled row crashed
 * the entire daily sync with `Required field task_name cannot be null`. This
 * helper closes that gap by dropping NOT NULL on the title columns at runtime
 * (idempotent — re-running on already-nullable columns is a no-op for BQ).
 *
 * Why runtime, not migration: BQ schemas live outside `migrations/` (which is
 * Postgres-only via node-pg-migrate). The pattern `ensureDeliveryTaskColumns()`
 * sets precedent for runtime BQ schema reconciliation; this function follows it.
 */
const ensureDeliveryTitleColumnsNullable = async (projectId: string) => {
  const bq = getBigQueryClient()

  const targets: Array<{ table: string; column: string }> = [
    { table: 'delivery_projects', column: 'project_name' },
    { table: 'delivery_tasks', column: 'task_name' },
    { table: 'delivery_sprints', column: 'sprint_name' }
  ]

  for (const { table, column } of targets) {
    try {
      await bq.query({
        query: `ALTER TABLE \`${projectId}.greenhouse_conformed.${table}\` ALTER COLUMN ${column} DROP NOT NULL`
      })
    } catch (error) {
      // Column may already be nullable, may not exist (cold start), or the
      // service account may lack ALTER permissions. Safe to continue — the
      // staged-swap write will surface the original "Required field" error
      // if the schema is still REQUIRED on the next run.
      console.warn(`[sync-notion-conformed] could not ensure NULLABLE on ${table}.${column}:`, error instanceof Error ? error.message : error)
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

// Emite un warning informativo (retryable=false) a source_sync_failures
// cuando una fracción de filas no logró resolver el título después de
// aplicar la cascada COALESCE sobre las columnas candidatas de Notion.
// No es un fallo — es visibilidad: si aparece, significa que el tenant
// tiene una property title con nombre que aún no está en la cascada, o
// que hay pages realmente sin título en Notion.
export const emitMissingTitleWarning = async ({
  syncRunId,
  surface,
  spaceId,
  count,
  samplePageIds
}: {
  syncRunId: string
  surface: 'delivery_projects' | 'delivery_tasks' | 'delivery_sprints'
  spaceId: string | null
  count: number
  samplePageIds: string[]
}) => {
  if (count <= 0) return

  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.source_sync_failures
         (sync_failure_id, sync_run_id, source_system, source_object_type,
          source_object_id, error_code, error_message, payload_json, retryable)
       VALUES ($1, $2, 'notion', $3, $4, 'sync_warning_missing_title', $5, $6::jsonb, FALSE)`,
      [
        randomUUID(),
        syncRunId,
        surface,
        spaceId,
        `[${surface}] ${count} rows sin título resoluble tras cascada en space ${spaceId ?? 'null'}`,
        JSON.stringify({
          space_id: spaceId,
          count,
          sample_notion_page_ids: samplePageIds.slice(0, 5),
          note: 'Cascada de título no resolvió ninguna columna candidata poblada. Revisar property title del space o agregar columna nueva a la cascada.'
        })
      ]
    )
  } catch {
    // Non-critical observability write; do not fail the sync because of it.
  }
}

const countMissingTitles = <T extends { project_name?: string | null; task_name?: string | null; sprint_name?: string | null; project_source_id?: string | null; task_source_id?: string | null; sprint_source_id?: string | null; space_id?: string | null }>(
  rows: T[],
  titleKey: 'project_name' | 'task_name' | 'sprint_name',
  sourceIdKey: 'project_source_id' | 'task_source_id' | 'sprint_source_id'
) => {
  const perSpace = new Map<string | null, { count: number; sample: string[] }>()

  for (const row of rows) {
    const title = row[titleKey]

    if (title !== null && title !== undefined && typeof title === 'string' && title.trim() !== '') continue

    const key = row.space_id ?? null
    const bucket = perSpace.get(key) ?? { count: 0, sample: [] }

    bucket.count += 1

    if (bucket.sample.length < 5) {
      const sourceId = row[sourceIdKey]

      if (typeof sourceId === 'string' && sourceId) {
        bucket.sample.push(sourceId)
      }
    }

    perSpace.set(key, bucket)
  }

  return perSpace
}

const uniqueSpaceIds = (spaceIds: Array<string | null | undefined>) =>
  Array.from(new Set(spaceIds.filter((spaceId): spaceId is string => Boolean(spaceId))))

const buildReadyTargetSpaceIds = ({
  rawFreshness,
  requestedSpaceIds
}: {
  rawFreshness: NotionRawFreshnessGateResult
  requestedSpaceIds?: string[]
}) => {
  const readySpaceIds = new Set(
    rawFreshness.spaces.filter(space => space.ready).map(space => space.spaceId)
  )

  if (!requestedSpaceIds || requestedSpaceIds.length === 0) {
    return Array.from(readySpaceIds)
  }

  return uniqueSpaceIds(requestedSpaceIds).filter(spaceId => readySpaceIds.has(spaceId))
}

const readMaxSyncedAtBySpace = async ({
  projectId,
  dataset,
  table,
  spaceIds,
  syncedAtColumn
}: {
  projectId: string
  dataset: string
  table: string
  spaceIds: string[]
  syncedAtColumn: string
}) => {
  if (spaceIds.length === 0) {
    return new Map<string, string | null>()
  }

  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT
        space_id,
        MAX(${syncedAtColumn}) AS max_synced_at
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE space_id IN UNNEST(@spaceIds)
      GROUP BY space_id
    `,
    params: { spaceIds }
  }) as [FreshnessAggregateRow[], unknown]

  return new Map(
    rows.map(row => [
      toNullableString(row.space_id) ?? '',
      toTimestampValue(row.max_synced_at)
    ] as const)
  )
}

type FreshnessAggregateRow = {
  space_id: string | null
  max_synced_at: { value?: string } | string | null
}

type SpaceScopedFreshnessSnapshot = {
  raw: {
    tasks: string | null
    projects: string | null
    sprints: string | null
  }
  conformed: {
    tasks: string | null
    projects: string | null
    sprints: string | null
  }
}

const readRawConformedFreshnessBySpace = async ({
  projectId,
  spaceIds
}: {
  projectId: string
  spaceIds: string[]
}) => {
  const [
    rawTaskMap,
    rawProjectMap,
    rawSprintMap,
    conformedTaskMap,
    conformedProjectMap,
    conformedSprintMap
  ] = await Promise.all([
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'notion_ops',
      table: 'tareas',
      spaceIds,
      syncedAtColumn: '_synced_at'
    }),
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'notion_ops',
      table: 'proyectos',
      spaceIds,
      syncedAtColumn: '_synced_at'
    }),
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'notion_ops',
      table: 'sprints',
      spaceIds,
      syncedAtColumn: '_synced_at'
    }),
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'greenhouse_conformed',
      table: 'delivery_tasks',
      spaceIds,
      syncedAtColumn: 'synced_at'
    }),
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'greenhouse_conformed',
      table: 'delivery_projects',
      spaceIds,
      syncedAtColumn: 'synced_at'
    }),
    readMaxSyncedAtBySpace({
      projectId,
      dataset: 'greenhouse_conformed',
      table: 'delivery_sprints',
      spaceIds,
      syncedAtColumn: 'synced_at'
    })
  ])

  return new Map(
    spaceIds.map(spaceId => [
      spaceId,
      {
        raw: {
          tasks: rawTaskMap.get(spaceId) ?? null,
          projects: rawProjectMap.get(spaceId) ?? null,
          sprints: rawSprintMap.get(spaceId) ?? null
        },
        conformed: {
          tasks: conformedTaskMap.get(spaceId) ?? null,
          projects: conformedProjectMap.get(spaceId) ?? null,
          sprints: conformedSprintMap.get(spaceId) ?? null
        }
      } satisfies SpaceScopedFreshnessSnapshot
    ] as const)
  )
}

const isSpaceFreshEnough = (freshness: SpaceScopedFreshnessSnapshot) =>
  isConformedTableFreshEnough(freshness.raw.tasks, freshness.conformed.tasks) &&
  isConformedTableFreshEnough(freshness.raw.projects, freshness.conformed.projects) &&
  isConformedTableFreshEnough(freshness.raw.sprints, freshness.conformed.sprints)

const formatSpaceFreshnessSnapshot = (
  freshnessBySpace: Map<string, SpaceScopedFreshnessSnapshot>,
  spaceIds: string[]
) =>
  JSON.stringify(
    Object.fromEntries(
      spaceIds.map(spaceId => [
        spaceId,
        freshnessBySpace.get(spaceId) ?? {
          raw: { tasks: null, projects: null, sprints: null },
          conformed: { tasks: null, projects: null, sprints: null }
        }
      ])
    )
  )

// ─── Main Sync Function ─────────────────────────────────────────────────────

export const syncNotionToConformed = async (input?: {
  rawFreshness?: NotionRawFreshnessGateResult
  syncRunId?: string
  spaceIds?: string[]
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

    const readySpaceIds = buildReadyTargetSpaceIds({
      rawFreshness,
      requestedSpaceIds: input?.spaceIds
    })

    const isPartialSync = readySpaceIds.length > 0 && readySpaceIds.length < rawFreshness.activeSpaceCount

    if (readySpaceIds.length === 0) {
      await writeSyncConformedRunRecord({
        syncRunId,
        status: 'cancelled',
        notes: input?.spaceIds?.length
          ? `Conformed sync skipped: no ready spaces inside requested scope. raw_reason=${rawFreshness.reason}`
          : `Conformed sync skipped: ${rawFreshness.reason}`
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

    const freshnessBySpace = await readRawConformedFreshnessBySpace({
      projectId,
      spaceIds: readySpaceIds
    })

    const writableSpaceIds = readySpaceIds.filter(spaceId => {
      const freshness = freshnessBySpace.get(spaceId)

      return freshness ? !isSpaceFreshEnough(freshness) : true
    })

    if (writableSpaceIds.length === 0) {
      const notes =
        `Conformed sync already current for requested spaces; write skipped. freshness=${formatSpaceFreshnessSnapshot(freshnessBySpace, readySpaceIds)}`

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

    const targetSpaceIds = writableSpaceIds

    const rawSourceSpaceFilterSql = buildSpaceFilterSql({
      columnName: 'space_id',
      spaceIds: targetSpaceIds
    })

    const [projectColumns, taskColumns, sprintColumns] = await Promise.all([
      readTableColumns('notion_ops', 'proyectos'),
      readTableColumns('notion_ops', 'tareas'),
      readTableColumns('notion_ops', 'sprints')
    ])

    const rawProjectNameExpression = buildRawProjectNameExpression(projectColumns)
    const rawTaskNameExpression = buildRawTaskNameExpression(taskColumns)
    const rawSprintNameExpression = buildRawSprintNameExpression(sprintColumns)
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
             ${rawProjectNameExpression} AS nombre_del_proyecto,
             resumen, estado, \`finalización\`, pct_on_time,
             prioridad, rpa_promedio, fechas, fechas_end, page_url, propietario_ids,
             business_unit
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id IS NOT NULL${rawSourceSpaceFilterSql}
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
      WHERE notion_page_id IS NOT NULL${rawSourceSpaceFilterSql}
    `),
    runBigQuery<NotionSprintRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             ${rawSprintNameExpression} AS nombre_del_sprint,
             estado_del_sprint, fechas, fechas_end,
             tareas_completadas, total_de_tareas, page_url
      FROM \`${projectId}.notion_ops.sprints\`
      WHERE notion_page_id IS NOT NULL${rawSourceSpaceFilterSql}
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

  // Resolve team members for assignee mapping. TASK-877 makes Postgres
  // identity_profile_source_links canonical; BigQuery remains a compatibility
  // fallback while conformed sync consumers migrate.
  const { map: notionMemberMap, source: notionMemberMapSource } = await loadNotionMemberMapPostgresFirst()

  console.info(`[sync-cron] Notion assignee member map loaded from ${notionMemberMapSource} (${notionMemberMap.size} links)`)

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
      project_name: toNullableString(row.nombre_del_proyecto),
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
      task_name: toNullableString(row.nombre_de_tarea),
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
      sprint_name: toNullableString(row.nombre_del_sprint),
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

  // 5b. Emit observability warnings for rows where the title cascade did not
  // resolve. This surfaces tenants with a title property named outside our
  // cascade, or pages truly untitled in Notion. Writes to source_sync_failures
  // with retryable=false (informational, not a real failure).
  const projectMissingBySpace = countMissingTitles(deliveryProjects, 'project_name', 'project_source_id')
  const taskMissingBySpace = countMissingTitles(deliveryTasks, 'task_name', 'task_source_id')
  const sprintMissingBySpace = countMissingTitles(deliverySprints, 'sprint_name', 'sprint_source_id')

  await Promise.all([
    ...[...projectMissingBySpace.entries()].map(([spaceId, bucket]) =>
      emitMissingTitleWarning({
        syncRunId,
        surface: 'delivery_projects',
        spaceId,
        count: bucket.count,
        samplePageIds: bucket.sample
      })
    ),
    ...[...taskMissingBySpace.entries()].map(([spaceId, bucket]) =>
      emitMissingTitleWarning({
        syncRunId,
        surface: 'delivery_tasks',
        spaceId,
        count: bucket.count,
        samplePageIds: bucket.sample
      })
    ),
    ...[...sprintMissingBySpace.entries()].map(([spaceId, bucket]) =>
      emitMissingTitleWarning({
        syncRunId,
        surface: 'delivery_sprints',
        spaceId,
        count: bucket.count,
        samplePageIds: bucket.sample
      })
    )
  ])

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
  await ensureDeliveryTitleColumnsNullable(projectId)

  // Stage into unique tables, then atomically swap into the canonical tables.
  // This avoids partial writes if one replacement fails mid-run and reduces
  // repeated table-update pressure on the canonical targets.
  await replaceBigQueryTablesWithStagedSwap({
    projectId,
    dataset: 'greenhouse_conformed',
    replacements: [
      {
        table: 'delivery_projects',
        rows: deliveryProjects,
        preserveWhereSql: isPartialSync ? buildPreserveNonReadySpaceSql(targetSpaceIds) : null
      },
      {
        table: 'delivery_tasks',
        rows: deliveryTasks,
        preserveWhereSql: isPartialSync ? buildPreserveNonReadySpaceSql(targetSpaceIds) : null
      },
      {
        table: 'delivery_sprints',
        rows: deliverySprints,
        preserveWhereSql: isPartialSync ? buildPreserveNonReadySpaceSql(targetSpaceIds) : null
      }
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
      WHERE TRUE${buildSpaceFilterSql({
        columnName: 'space_id',
        spaceIds: targetSpaceIds
      })}
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

    if (!targetSpaceIds.includes(spaceId)) {
      continue
    }

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

  const persistedParitySnapshot = await readPersistedNotionTaskParitySnapshot(
    projectId,
    targetSpaceIds
  )

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

  // PostgreSQL projection — non-blocking tail step
  //
  // After the canonical BQ-conformed write succeeds, project the same rows
  // into Postgres `greenhouse_delivery.{projects,tasks,sprints}` using the
  // canonical `projectNotionDeliveryToPostgres` helper.
  //
  // Before this step existed, PG was only updated by the manual ad-hoc script
  // `pnpm sync:source-runtime-projections`, which had no schedule — leaving PG
  // 24+ days behind BQ for both spaces. The Reliability Control Plane's
  // "untitled pages" queue surfaced 3,041 PG-stale rows even though BQ
  // conformed had the resolved titles.
  //
  // **Defensively wrapped**:
  //   - Wrapped in try/catch — PG-side failures NEVER fail the BQ-conformed
  //     write (which was the user-visible canonical step before).
  //   - Gated by env `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED` (default `true`).
  //     Set to `false` to revert to the previous behavior without a deploy.
  //   - Idempotent UPSERT by `notion_*_id` — re-running on the same data is a
  //     no-op. Other writers (reactive event handlers) can interleave safely
  //     because each entity uses per-row UPSERT, not table-level locks.
  //   - `replaceMissingForSpaces=true` mirrors the BQ staged-swap semantics:
  //     anything that disappeared from the cycle's input is marked deleted in
  //     PG too.
  if (process.env.GREENHOUSE_NOTION_PG_PROJECTION_ENABLED?.trim().toLowerCase() !== 'false') {
    try {
      const { projectNotionDeliveryToPostgres } = await import('@/lib/sync/project-notion-delivery-to-postgres')

      const pgResult = await projectNotionDeliveryToPostgres({
        syncRunId,
        projects: deliveryProjects.map(p => ({
          project_source_id: p.project_source_id,
          space_id: p.space_id,
          client_id: p.client_id,
          module_id: p.module_id ?? null,
          project_database_source_id: p.project_database_source_id,
          project_name: p.project_name,
          project_status: p.project_status,
          project_summary: p.project_summary,
          completion_label: p.completion_label,
          on_time_pct_source: p.on_time_pct_source,
          avg_rpa_source: p.avg_rpa_source,
          project_phase: p.project_phase,
          owner_member_id: p.owner_member_id,
          start_date: p.start_date,
          end_date: p.end_date,
          page_url: p.page_url,
          is_deleted: p.is_deleted,
          last_edited_time: typeof p.last_edited_time === 'string' ? p.last_edited_time : null,
          synced_at: p.synced_at,
          sync_run_id: syncRunId,
          payload_hash: p.payload_hash
        })),
        sprints: deliverySprints.map(s => ({
          sprint_source_id: s.sprint_source_id,
          project_source_id: s.project_source_id,
          space_id: s.space_id,
          project_database_source_id: s.project_database_source_id,
          sprint_name: s.sprint_name,
          sprint_status: s.sprint_status,
          start_date: s.start_date,
          end_date: s.end_date,
          completed_tasks_count: s.completed_tasks_count,
          total_tasks_count: s.total_tasks_count,
          completion_pct_source: s.completion_pct_source,
          page_url: s.page_url,
          is_deleted: s.is_deleted,
          last_edited_time: typeof s.last_edited_time === 'string' ? s.last_edited_time : null,
          synced_at: s.synced_at,
          sync_run_id: syncRunId,
          payload_hash: s.payload_hash
        })),
        tasks: deliveryTasks.map(t => ({
          task_source_id: t.task_source_id,
          project_source_id: t.project_source_id,
          project_source_ids: t.project_source_ids,
          sprint_source_id: t.sprint_source_id,
          space_id: t.space_id,
          client_id: t.client_id,
          module_id: t.module_id,
          module_code: t.module_code,
          assignee_member_id: t.assignee_member_id,
          assignee_source_id: t.assignee_source_id,
          assignee_member_ids: t.assignee_member_ids,
          project_database_source_id: t.project_database_source_id,
          task_name: t.task_name,
          task_status: t.task_status,
          task_phase: t.task_phase,
          task_priority: t.task_priority,
          completion_label: t.completion_label,
          delivery_compliance: t.delivery_compliance,
          days_late: t.days_late,
          rescheduled_days: t.rescheduled_days,
          is_rescheduled: t.is_rescheduled,
          performance_indicator_label: t.performance_indicator_label,
          performance_indicator_code: t.performance_indicator_code,
          client_change_round_label: t.client_change_round_label,
          client_change_round_final: t.client_change_round_final,
          rpa_semaphore_source: t.rpa_semaphore_source,
          rpa_value: t.rpa_value,
          frame_versions: t.frame_versions,
          frame_comments: t.frame_comments,
          open_frame_comments: t.open_frame_comments,
          client_review_open: t.client_review_open,
          workflow_review_open: t.workflow_review_open,
          blocker_count: t.blocker_count,
          last_frame_comment: t.last_frame_comment,
          tarea_principal_ids: t.tarea_principal_ids,
          subtareas_ids: t.subtareas_ids,
          original_due_date: t.original_due_date,
          execution_time_label: t.execution_time_label,
          changes_time_label: t.changes_time_label,
          review_time_label: t.review_time_label,
          workflow_change_round: t.workflow_change_round,
          due_date: t.due_date,
          completed_at: typeof t.completed_at === 'string' ? t.completed_at : null,
          page_url: t.page_url,
          is_deleted: t.is_deleted,
          last_edited_time: typeof t.last_edited_time === 'string' ? t.last_edited_time : null,
          synced_at: t.synced_at,
          sync_run_id: syncRunId,
          payload_hash: t.payload_hash,
          created_at: typeof t.created_at === 'string' ? t.created_at : null
        })),
        targetSpaceIds,
        replaceMissingForSpaces: !isPartialSync
      })

      console.log(
        `[sync-conformed] PG projection: projects=${pgResult.projectsWritten}/+${pgResult.projectsMarkedDeleted}d, ` +
        `sprints=${pgResult.sprintsWritten}/+${pgResult.sprintsMarkedDeleted}d, ` +
        `tasks=${pgResult.tasksWritten}/+${pgResult.tasksMarkedDeleted}d, ${pgResult.durationMs}ms`
      )
    } catch (err) {
      // Non-blocking — BQ-conformed already succeeded which is the user-visible
      // contract for this cycle. PG can be back-filled by re-running the cron
      // (idempotent) or by toggling the kill-switch off and using the legacy
      // manual script.
      console.warn('[sync-conformed] PG projection failed (non-blocking, BQ conformed unaffected):', err)
    }
  }

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
