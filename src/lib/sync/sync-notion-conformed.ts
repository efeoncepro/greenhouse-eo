import 'server-only'

import { randomUUID, createHash } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SyncConformedResult {
  syncRunId: string
  projectsRead: number
  tasksRead: number
  sprintsRead: number
  conformedRowsWritten: number
  durationMs: number
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

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') { const t = value.trim(); return t || null }
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

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  return toNullableString(value)?.toLowerCase() === 'true'
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

const INTERNAL_SPACE_IDS = new Set(['space-efeonce'])
const isInternalSpaceId = (spaceId: string | null) => (spaceId ? INTERNAL_SPACE_IDS.has(spaceId) : false)

// ─── BigQuery Runners ───────────────────────────────────────────────────────

const runBigQuery = async <T extends Record<string, unknown>>(query: string) => {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({ query })
  return rows as T[]
}

const insertBigQueryRows = async (dataset: string, table: string, rows: Record<string, unknown>[]) => {
  const bq = getBigQueryClient()
  await bq.dataset(dataset).table(table).insert(rows)
}

/** Ensure delivery_tasks has the assignee_member_ids ARRAY column (idempotent). */
const ensureMultiAssigneeColumn = async (projectId: string) => {
  const bq = getBigQueryClient()

  try {
    await bq.query({
      query: `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS assignee_member_ids ARRAY<STRING>`
    })
  } catch {
    // Column may already exist or service account lacks ALTER permissions — safe to continue
  }
}

// ─── Main Sync Function ─────────────────────────────────────────────────────

export const syncNotionToConformed = async (): Promise<SyncConformedResult> => {
  const start = Date.now()
  const syncRunId = `sync-cron-${randomUUID()}`
  const projectId = getBigQueryProjectId()
  const nowIso = new Date().toISOString()

  // 1. Read from notion_ops (populated by external notion-bq-sync Cloud Run)
  const [projects, tasks, sprints] = await Promise.all([
    runBigQuery<NotionProjectRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             nombre_del_proyecto, resumen, estado, \`finalización\`, pct_on_time,
             prioridad, rpa_promedio, fechas, fechas_end, page_url, propietario_ids
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id IS NOT NULL
    `),
    runBigQuery<NotionTaskRow>(`
      SELECT notion_page_id, _source_database_id, space_id, created_time, last_edited_time,
             COALESCE(nombre_de_tarea, nombre_de_la_tarea) AS nombre_de_tarea,
             COALESCE(estado, estado_1) AS estado,
             prioridad, \`priorización\`, completitud,
             cumplimiento, \`días_de_retraso\`, \`días_reprogramados\`, reprogramada,
             indicador_de_performance, client_change_round,
             COALESCE(client_change_round_final, cantidad_de_correcciones) AS client_change_round_final,
             COALESCE(rpa, rondas) AS rpa,
             COALESCE(\`semáforo_rpa\`, \`semáforo_rondas\`) AS \`semáforo_rpa\`,
             frame_versions, frame_comments, open_frame_comments,
             client_review_open, workflow_review_open, bloqueado_por_ids,
             last_frame_comment, proyecto_ids, sprint_ids,
             COALESCE(responsables_ids, responsable_ids) AS responsables_ids,
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
    const projectSourceId = row.proyecto_ids?.[0] || null
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

    return {
      task_source_id: toNullableString(row.notion_page_id),
      project_source_id: projectSourceId,
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

    return {
      syncRunId,
      projectsRead: projects.length,
      tasksRead: tasks.length,
      sprintsRead: sprints.length,
      conformedRowsWritten: 0,
      durationMs: Date.now() - start
    }
  }

  const bq = getBigQueryClient()

  // Ensure multi-assignee column exists before inserting
  await ensureMultiAssigneeColumn(projectId)

  await Promise.all([
    bq.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_projects\` WHERE TRUE` }),
    bq.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` WHERE TRUE` }),
    bq.query({ query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_sprints\` WHERE TRUE` })
  ])

  await insertBigQueryRows('greenhouse_conformed', 'delivery_projects', deliveryProjects)
  await insertBigQueryRows('greenhouse_conformed', 'delivery_tasks', deliveryTasks)
  await insertBigQueryRows('greenhouse_conformed', 'delivery_sprints', deliverySprints)

  const conformedRowsWritten = deliveryProjects.length + deliveryTasks.length + deliverySprints.length

  // 7. Record sync run in PostgreSQL
  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.source_sync_runs
        (sync_run_id, source_system, source_object_type, sync_mode, status,
         records_read, records_written_conformed, triggered_by, finished_at)
       VALUES ($1, 'notion', 'cron_conformed', 'incremental', 'succeeded',
               $2, $3, 'vercel_cron', CURRENT_TIMESTAMP)
       ON CONFLICT (sync_run_id) DO NOTHING`,
      [syncRunId, tasks.length, conformedRowsWritten]
    )
  } catch {
    // Non-critical — sync succeeded even if audit record fails
  }

  return {
    syncRunId,
    projectsRead: projects.length,
    tasksRead: tasks.length,
    sprintsRead: sprints.length,
    conformedRowsWritten,
    durationMs: Date.now() - start
  }
}
