import process from 'node:process'
import { randomUUID, createHash } from 'node:crypto'

import { BigQuery } from '@google-cloud/bigquery'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

type SyncSummary = {
  syncRunId: string
  recordsRead: number
  recordsWrittenRaw: number
  recordsWrittenConformed: number
  recordsProjectedPostgres: number
  watermarkEndValue: string | null
}

type NotionProjectRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_del_proyecto: string | null
  estado: string | null
  prioridad: string | null
  fechas: string | null
  fechas_end: string | null
  propietario_ids: string[] | null
}

type NotionTaskRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_de_tarea: string | null
  estado: string | null
  prioridad: string | null
  priorización: string | null
  proyecto_ids: string[] | null
  sprint_ids: string[] | null
  responsables_ids: string[] | null
  fecha_límite: string | null
  fecha_límite_end: string | null
  fecha_de_completado: string | null
}

type NotionSprintRow = {
  notion_page_id: string | null
  _source_database_id: string | null
  created_time: { value?: string } | string | null
  last_edited_time: { value?: string } | string | null
  nombre_del_sprint: string | null
  estado_del_sprint: string | null
  fechas: string | null
  fechas_end: string | null
}

type ClientNotionBindingRow = {
  client_id: string | null
  client_name: string | null
  notion_project_ids: string[] | null
}

type HubspotCompanyRow = {
  hs_object_id: string | null
  name: string | null
  hubspot_owner_id: string | null
  lifecyclestage: string | null
  industry: string | null
  country: string | null
  website: string | null
  linea_de_servicio: string | null
  hs_lastmodifieddate: { value?: string } | string | null
  hs_archived: boolean | null
}

type HubspotDealRow = {
  hs_object_id: string | null
  assoc_companies: string | null
  dealname: string | null
  pipeline: string | null
  dealstage: string | null
  pipeline_bucket: string | null
  amount: string | null
  deal_currency_code: string | null
  closedate: { value?: string } | string | null
  hubspot_owner_id: string | null
  linea_de_servicio: string | null
  hs_lastmodifieddate: { value?: string } | string | null
  hs_is_closed_won: string | null
  hs_is_closed_lost: string | null
  hs_archived: boolean | null
}

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'

const bigQuery = new BigQuery({ projectId })

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed ? trimmed : null
  }

  if (typeof value === 'object' && value && 'value' in value) {
    return toNullableString((value as { value?: unknown }).value)
  }

  return String(value)
}

const normalizeModuleCode = (value: unknown) => {
  const normalized = toNullableString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase()

  return normalized || null
}

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = toNullableString(value)?.toLowerCase()

  return normalized === 'true'
}

const toNumber = (value: unknown) => {
  const normalized = toNullableString(value)

  if (!normalized) {
    return null
  }

  const numeric = Number(normalized.replace(/,/g, ''))

  return Number.isFinite(numeric) ? numeric : null
}

const toDateValue = (value: unknown) => {
  const normalized = toNullableString(value)

  if (!normalized) {
    return null
  }

  return normalized.slice(0, 10)
}

const toTimestampValue = (value: unknown) => {
  const normalized = toNullableString(value)

  if (!normalized) {
    return null
  }

  if (normalized.includes('T')) {
    return normalized
  }

  return `${normalized}T00:00:00.000Z`
}

const firstCsvValue = (value: string | null) => {
  if (!value) {
    return null
  }

  const first = value
    .split(',')
    .map(part => part.trim())
    .find(Boolean)

  return first || null
}

const buildPayloadHash = (payload: unknown) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

const INTERNAL_SPACE_IDS = new Set(['space-efeonce'])

const isInternalSpaceId = (spaceId: string | null) => (spaceId ? INTERNAL_SPACE_IDS.has(spaceId) : false)

const buildPreferredSpaceMap = (rows: ClientNotionBindingRow[]) => {
  const bindings = new Map<string, Array<{ spaceId: string; isInternal: boolean }>>()

  for (const row of rows) {
    const spaceId = toNullableString(row.client_id)

    if (!spaceId) {
      continue
    }

    const internal = isInternalSpaceId(spaceId)

    for (const projectId of row.notion_project_ids || []) {
      const normalizedProjectId = toNullableString(projectId)

      if (!normalizedProjectId) {
        continue
      }

      const existing = bindings.get(normalizedProjectId) || []

      bindings.set(normalizedProjectId, [...existing, { spaceId, isInternal: internal }])
    }
  }

  const preferred = new Map<string, string>()

  for (const [projectId, candidates] of bindings.entries()) {
    const canonicalCandidates = candidates.filter(candidate => !candidate.isInternal)
    const winner = (canonicalCandidates[0] || candidates[0])?.spaceId

    if (winner) {
      preferred.set(projectId, winner)
    }
  }

  return preferred
}


const runBigQuery = async <T extends Record<string, unknown>>(query: string) => {
  const [rows] = await bigQuery.query({
    query,
    location: bigQueryLocation
  })

  return rows as T[]
}

const describeBigQueryInsertError = (label: string, error: unknown) => {
  if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
    const sample = error.errors.slice(0, 5)

    return new Error(`${label} failed: ${JSON.stringify(sample, null, 2)}`)
  }

  return error instanceof Error ? new Error(`${label} failed: ${error.message}`) : new Error(`${label} failed`)
}

const insertBigQueryRows = async (dataset: string, table: string, rows: Record<string, unknown>[]) => {
  try {
    await bigQuery.dataset(dataset).table(table).insert(rows)
  } catch (error) {
    throw describeBigQueryInsertError(`${dataset}.${table}`, error)
  }
}

const writeSyncRun = async ({
  syncRunId,
  sourceSystem,
  sourceObjectType,
  status,
  notes,
  recordsRead = 0,
  recordsWrittenRaw = 0,
  recordsWrittenConformed = 0,
  recordsProjectedPostgres = 0,
  watermarkEndValue = null
}: {
  syncRunId: string
  sourceSystem: string
  sourceObjectType: string
  status: 'running' | 'succeeded' | 'failed'
  notes?: string | null
  recordsRead?: number
  recordsWrittenRaw?: number
  recordsWrittenConformed?: number
  recordsProjectedPostgres?: number
  watermarkEndValue?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id,
        source_system,
        source_object_type,
        sync_mode,
        status,
        watermark_key,
        watermark_end_value,
        records_read,
        records_written_raw,
        records_written_conformed,
        records_projected_postgres,
        triggered_by,
        notes,
        finished_at
      )
      VALUES ($1, $2, $3, 'seed_from_legacy', $4, 'max_source_updated_at', $5, $6, $7, $8, $9, 'codex', $10, CASE WHEN $4 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
      ON CONFLICT (sync_run_id) DO UPDATE
      SET
        status = EXCLUDED.status,
        watermark_end_value = EXCLUDED.watermark_end_value,
        records_read = EXCLUDED.records_read,
        records_written_raw = EXCLUDED.records_written_raw,
        records_written_conformed = EXCLUDED.records_written_conformed,
        records_projected_postgres = EXCLUDED.records_projected_postgres,
        notes = EXCLUDED.notes,
        finished_at = EXCLUDED.finished_at
    `,
    [
      syncRunId,
      sourceSystem,
      sourceObjectType,
      status,
      watermarkEndValue,
      recordsRead,
      recordsWrittenRaw,
      recordsWrittenConformed,
      recordsProjectedPostgres,
      notes || null
    ]
  )
}

const writeWatermark = async ({
  sourceSystem,
  sourceObjectType,
  value,
  syncRunId
}: {
  sourceSystem: string
  sourceObjectType: string
  value: string | null
  syncRunId: string
}) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_sync.source_sync_watermarks (
        watermark_id,
        source_system,
        source_object_type,
        watermark_key,
        watermark_value,
        watermark_updated_at,
        sync_run_id
      )
      VALUES ($1, $2, $3, 'max_source_updated_at', $4, CURRENT_TIMESTAMP, $5)
      ON CONFLICT (source_system, source_object_type, watermark_key) DO UPDATE
      SET
        watermark_value = EXCLUDED.watermark_value,
        watermark_updated_at = EXCLUDED.watermark_updated_at,
        sync_run_id = EXCLUDED.sync_run_id,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      `${sourceSystem}-${sourceObjectType}-max_source_updated_at`,
      sourceSystem,
      sourceObjectType,
      value,
      syncRunId
    ]
  )
}

const writeFailure = async ({
  syncRunId,
  sourceSystem,
  sourceObjectType,
  error
}: {
  syncRunId: string
  sourceSystem: string
  sourceObjectType: string
  error: unknown
}) => {
  const message = error instanceof Error ? error.message : String(error)

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_sync.source_sync_failures (
        sync_failure_id,
        sync_run_id,
        source_system,
        source_object_type,
        error_code,
        error_message,
        payload_json,
        retryable
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE)
    `,
    [
      randomUUID(),
      syncRunId,
      sourceSystem,
      sourceObjectType,
      error instanceof Error ? error.name : 'SyncError',
      message,
      JSON.stringify({ stack: error instanceof Error ? error.stack || null : null })
    ]
  )
}

const syncNotion = async (): Promise<SyncSummary> => {
  const syncRunId = `sync-notion-${randomUUID()}`

  await writeSyncRun({
    syncRunId,
    sourceSystem: 'notion',
    sourceObjectType: 'runtime_projection_seed',
    status: 'running',
    notes: 'Initial seed from notion_ops into raw, conformed and PostgreSQL delivery projections.'
  })

  try {
    const [projects, tasks, sprints] = await Promise.all([
      runBigQuery<NotionProjectRow>(
        `
          SELECT
            notion_page_id,
            _source_database_id,
            created_time,
            last_edited_time,
            nombre_del_proyecto,
            estado,
            prioridad,
            fechas,
            fechas_end,
            propietario_ids
          FROM \`${projectId}.notion_ops.proyectos\`
          WHERE notion_page_id IS NOT NULL
        `
      ),
      runBigQuery<NotionTaskRow>(
        `
          SELECT
            notion_page_id,
            _source_database_id,
            created_time,
            last_edited_time,
            nombre_de_tarea,
            estado,
            prioridad,
            \`priorización\`,
            proyecto_ids,
            sprint_ids,
            responsables_ids,
            \`fecha_límite\`,
            \`fecha_límite_end\`,
            fecha_de_completado
          FROM \`${projectId}.notion_ops.tareas\`
          WHERE notion_page_id IS NOT NULL
        `
      ),
      runBigQuery<NotionSprintRow>(
        `
          SELECT
            notion_page_id,
            _source_database_id,
            created_time,
            last_edited_time,
            nombre_del_sprint,
            estado_del_sprint,
            fechas,
            fechas_end
          FROM \`${projectId}.notion_ops.sprints\`
          WHERE notion_page_id IS NOT NULL
        `
      )
    ])

    const clientBindings = await runBigQuery<ClientNotionBindingRow>(
      `
        SELECT client_id, client_name, notion_project_ids
        FROM \`${projectId}.greenhouse.clients\`
        WHERE notion_project_ids IS NOT NULL
      `
    )

    const nowIso = new Date().toISOString()
    const preferredSpaceMap = buildPreferredSpaceMap(clientBindings)

    const rawProjectRows = projects.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'notion',
      source_object_type: 'project',
      source_object_id: toNullableString(row.notion_page_id),
      source_parent_object_id: toNullableString(row._source_database_id),
      source_created_at: toTimestampValue(row.created_time),
      source_updated_at: toTimestampValue(row.last_edited_time),
      source_deleted_at: null,
      archived: false,
      in_trash: false,
      is_deleted: false,
      payload_json: JSON.stringify(row),
      payload_hash: buildPayloadHash(row),
      ingested_at: nowIso,
      ingested_date: nowIso.slice(0, 10)
    }))

    const rawTaskRows = tasks.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'notion',
      source_object_type: 'task',
      source_object_id: toNullableString(row.notion_page_id),
      source_parent_object_id: toNullableString(row._source_database_id),
      source_created_at: toTimestampValue(row.created_time),
      source_updated_at: toTimestampValue(row.last_edited_time),
      source_deleted_at: null,
      archived: false,
      in_trash: false,
      is_deleted: false,
      payload_json: JSON.stringify(row),
      payload_hash: buildPayloadHash(row),
      ingested_at: nowIso,
      ingested_date: nowIso.slice(0, 10)
    }))

    const rawSprintRows = sprints.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'notion',
      source_object_type: 'sprint',
      source_object_id: toNullableString(row.notion_page_id),
      source_parent_object_id: toNullableString(row._source_database_id),
      source_created_at: toTimestampValue(row.created_time),
      source_updated_at: toTimestampValue(row.last_edited_time),
      source_deleted_at: null,
      archived: false,
      in_trash: false,
      is_deleted: false,
      payload_json: JSON.stringify(row),
      payload_hash: buildPayloadHash(row),
      ingested_at: nowIso,
      ingested_date: nowIso.slice(0, 10)
    }))

    await insertBigQueryRows('greenhouse_raw', 'notion_projects_snapshots', rawProjectRows)
    await insertBigQueryRows('greenhouse_raw', 'notion_tasks_snapshots', rawTaskRows)
    await insertBigQueryRows('greenhouse_raw', 'notion_sprints_snapshots', rawSprintRows)

    const deliveryProjects = projects.map(row => {
      const ownerSourceId = row.propietario_ids?.[0] || null
      const projectSourceId = toNullableString(row.notion_page_id)
      const projectDatabaseSourceId = toNullableString(row._source_database_id)
      const spaceId = projectSourceId ? preferredSpaceMap.get(projectSourceId) || null : null
      const clientId = spaceId && !isInternalSpaceId(spaceId) ? spaceId : null

      return {
        project_source_id: projectSourceId,
        project_database_source_id: projectDatabaseSourceId,
        space_id: spaceId,
        client_source_id: projectDatabaseSourceId,
        client_id: clientId,
        module_code: null,
        module_id: null,
        project_name: toNullableString(row.nombre_del_proyecto) || 'Sin nombre',
        project_status: toNullableString(row.estado),
        project_phase: null,
        owner_source_id: ownerSourceId,
        owner_member_id: null as string | null,
        start_date: toDateValue(row.fechas),
        end_date: toDateValue(row.fechas_end),
        last_edited_time: toTimestampValue(row.last_edited_time),
        payload_hash: buildPayloadHash(row),
        is_deleted: false,
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    const memberRows = await runBigQuery<{ member_id: string | null; notion_user_id: string | null }>(
      `
        SELECT member_id, notion_user_id
        FROM \`${projectId}.greenhouse.team_members\`
        WHERE notion_user_id IS NOT NULL
      `
    )

    const notionMemberMap = new Map(
      memberRows
        .map(row => [toNullableString(row.notion_user_id), toNullableString(row.member_id)] as const)
        .filter(([notionUserId, memberId]) => notionUserId && memberId)
    )

    for (const project of deliveryProjects) {
      project.owner_member_id = project.owner_source_id ? notionMemberMap.get(project.owner_source_id) || null : null
    }

    const projectClientMap = new Map(
      deliveryProjects
        .map(project => [project.project_source_id, project.client_id] as const)
        .filter(([projectSourceId]) => Boolean(projectSourceId))
    )

    const projectSpaceMap = new Map(
      deliveryProjects
        .map(project => [project.project_source_id, project.space_id] as const)
        .filter(([projectSourceId]) => Boolean(projectSourceId))
    )

    const projectDatabaseSourceMap = new Map(
      deliveryProjects
        .map(project => [project.project_source_id, project.project_database_source_id] as const)
        .filter(([projectSourceId]) => Boolean(projectSourceId))
    )

    const deliveryTasks = tasks.map(row => {
      const assigneeSourceId = row.responsables_ids?.[0] || null
      const projectSourceId = row.proyecto_ids?.[0] || null
      const sprintSourceId = row.sprint_ids?.[0] || null

      const projectDatabaseSourceId =
        (projectSourceId ? projectDatabaseSourceMap.get(projectSourceId) || null : null) ||
        toNullableString(row._source_database_id)

      const spaceId = projectSourceId ? projectSpaceMap.get(projectSourceId) || null : null
      const clientId = projectSourceId ? projectClientMap.get(projectSourceId) || null : null

      return {
        task_source_id: toNullableString(row.notion_page_id),
        project_source_id: projectSourceId,
        sprint_source_id: sprintSourceId,
        project_database_source_id: projectDatabaseSourceId,
        space_id: spaceId,
        client_source_id: projectDatabaseSourceId,
        client_id: clientId,
        module_code: null,
        module_id: null,
        task_name: toNullableString(row.nombre_de_tarea) || 'Sin nombre',
        task_status: toNullableString(row.estado),
        task_phase: toNullableString(row.priorización),
        task_priority: toNullableString(row.prioridad),
        assignee_source_id: assigneeSourceId,
        assignee_member_id: assigneeSourceId ? notionMemberMap.get(assigneeSourceId) || null : null,
        due_date: toDateValue(row['fecha_límite_end']) || toDateValue(row['fecha_límite']),
        completed_at: toTimestampValue(row.fecha_de_completado),
        last_edited_time: toTimestampValue(row.last_edited_time),
        payload_hash: buildPayloadHash(row),
        is_deleted: false,
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    const sprintProjectMap = new Map(
      deliveryTasks
        .map(task => [task.sprint_source_id, task.project_source_id] as const)
        .filter(([sprintSourceId, projectSourceId]) => Boolean(sprintSourceId) && Boolean(projectSourceId))
    )

    const sprintProjectDatabaseMap = new Map(
      deliveryTasks
        .map(task => [task.sprint_source_id, task.project_database_source_id] as const)
        .filter(([sprintSourceId, projectDatabaseSourceId]) => Boolean(sprintSourceId) && Boolean(projectDatabaseSourceId))
    )

    const sprintSpaceMap = new Map(
      deliveryTasks
        .map(task => [task.sprint_source_id, task.space_id] as const)
        .filter(([sprintSourceId, spaceId]) => Boolean(sprintSourceId) && Boolean(spaceId))
    )

    const deliverySprints = sprints.map(row => {
      const sprintSourceId = toNullableString(row.notion_page_id)

      const projectDatabaseSourceId =
        (sprintSourceId ? sprintProjectDatabaseMap.get(sprintSourceId) || null : null) ||
        toNullableString(row._source_database_id)

      return {
        sprint_source_id: sprintSourceId,
        project_source_id: sprintSourceId ? sprintProjectMap.get(sprintSourceId) || null : null,
        project_database_source_id: projectDatabaseSourceId,
        space_id: sprintSourceId ? sprintSpaceMap.get(sprintSourceId) || null : null,
        sprint_name: toNullableString(row.nombre_del_sprint) || 'Sin nombre',
        sprint_status: toNullableString(row.estado_del_sprint),
        start_date: toDateValue(row.fechas),
        end_date: toDateValue(row.fechas_end),
        last_edited_time: toTimestampValue(row.last_edited_time),
        payload_hash: buildPayloadHash(row),
        is_deleted: false,
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    await Promise.all([
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.delivery_projects\``,
        location: bigQueryLocation
      }),
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\``,
        location: bigQueryLocation
      }),
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.delivery_sprints\``,
        location: bigQueryLocation
      })
    ])

    await insertBigQueryRows('greenhouse_conformed', 'delivery_projects', deliveryProjects)
    await insertBigQueryRows('greenhouse_conformed', 'delivery_tasks', deliveryTasks)
    await insertBigQueryRows('greenhouse_conformed', 'delivery_sprints', deliverySprints)

    let projected = 0

    for (const project of deliveryProjects) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_delivery.projects (
            project_record_id,
            space_id,
            client_id,
            module_id,
            project_database_source_id,
            notion_project_id,
            project_name,
            project_status,
            project_phase,
            owner_member_id,
            start_date,
            end_date,
            active,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12::date, TRUE, $13, $14::timestamptz, $15::timestamptz, $16, $17)
          ON CONFLICT (notion_project_id) DO UPDATE
          SET
            space_id = EXCLUDED.space_id,
            client_id = EXCLUDED.client_id,
            module_id = EXCLUDED.module_id,
            project_database_source_id = EXCLUDED.project_database_source_id,
            project_name = EXCLUDED.project_name,
            project_status = EXCLUDED.project_status,
            project_phase = EXCLUDED.project_phase,
            owner_member_id = EXCLUDED.owner_member_id,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            active = EXCLUDED.active,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `project-${project.project_source_id}`,
          project.space_id,
          project.client_id,
          project.module_id,
          project.project_database_source_id,
          project.project_source_id,
          project.project_name,
          project.project_status,
          project.project_phase,
          project.owner_member_id,
          project.start_date,
          project.end_date,
          project.is_deleted,
          project.last_edited_time,
          project.synced_at,
          syncRunId,
          project.payload_hash
        ]
      )
      projected += 1
    }

    for (const sprint of deliverySprints) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_delivery.sprints (
            sprint_record_id,
            project_record_id,
            space_id,
            project_database_source_id,
            notion_sprint_id,
            sprint_name,
            sprint_status,
            start_date,
            end_date,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10, $11::timestamptz, $12::timestamptz, $13, $14)
          ON CONFLICT (notion_sprint_id) DO UPDATE
          SET
            project_record_id = EXCLUDED.project_record_id,
            space_id = EXCLUDED.space_id,
            project_database_source_id = EXCLUDED.project_database_source_id,
            sprint_name = EXCLUDED.sprint_name,
            sprint_status = EXCLUDED.sprint_status,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `sprint-${sprint.sprint_source_id}`,
          null,
          sprint.space_id,
          sprint.project_database_source_id,
          sprint.sprint_source_id,
          sprint.sprint_name,
          sprint.sprint_status,
          sprint.start_date,
          sprint.end_date,
          sprint.is_deleted,
          sprint.last_edited_time,
          sprint.synced_at,
          syncRunId,
          sprint.payload_hash
        ]
      )
      projected += 1
    }

    for (const task of deliveryTasks) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_delivery.tasks (
            task_record_id,
            project_record_id,
            sprint_record_id,
            space_id,
            client_id,
            module_id,
            assignee_member_id,
            project_database_source_id,
            notion_task_id,
            notion_project_id,
            notion_sprint_id,
            task_name,
            task_status,
            task_phase,
            task_priority,
            due_date,
            completed_at,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::date, $17::timestamptz, $18, $19::timestamptz, $20::timestamptz, $21, $22)
          ON CONFLICT (notion_task_id) DO UPDATE
          SET
            project_record_id = EXCLUDED.project_record_id,
            sprint_record_id = EXCLUDED.sprint_record_id,
            space_id = EXCLUDED.space_id,
            client_id = EXCLUDED.client_id,
            module_id = EXCLUDED.module_id,
            assignee_member_id = EXCLUDED.assignee_member_id,
            project_database_source_id = EXCLUDED.project_database_source_id,
            notion_project_id = EXCLUDED.notion_project_id,
            notion_sprint_id = EXCLUDED.notion_sprint_id,
            task_name = EXCLUDED.task_name,
            task_status = EXCLUDED.task_status,
            task_phase = EXCLUDED.task_phase,
            task_priority = EXCLUDED.task_priority,
            due_date = EXCLUDED.due_date,
            completed_at = EXCLUDED.completed_at,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `task-${task.task_source_id}`,
          task.project_source_id ? `project-${task.project_source_id}` : null,
          task.sprint_source_id ? `sprint-${task.sprint_source_id}` : null,
          task.space_id,
          task.client_id,
          task.module_id,
          task.assignee_member_id,
          task.project_database_source_id,
          task.task_source_id,
          task.project_source_id,
          task.sprint_source_id,
          task.task_name,
          task.task_status,
          task.task_phase,
          task.task_priority,
          task.due_date,
          task.completed_at,
          task.is_deleted,
          task.last_edited_time,
          task.synced_at,
          syncRunId,
          task.payload_hash
        ]
      )
      projected += 1
    }

    const notionWatermark = [projects, tasks, sprints]
      .flat()
      .map(row => toTimestampValue(row.last_edited_time))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) || null

    await Promise.all([
      writeWatermark({ sourceSystem: 'notion', sourceObjectType: 'projects', value: notionWatermark, syncRunId }),
      writeWatermark({ sourceSystem: 'notion', sourceObjectType: 'tasks', value: notionWatermark, syncRunId }),
      writeWatermark({ sourceSystem: 'notion', sourceObjectType: 'sprints', value: notionWatermark, syncRunId })
    ])

    await writeSyncRun({
      syncRunId,
      sourceSystem: 'notion',
      sourceObjectType: 'runtime_projection_seed',
      status: 'succeeded',
      recordsRead: projects.length + tasks.length + sprints.length,
      recordsWrittenRaw: rawProjectRows.length + rawTaskRows.length + rawSprintRows.length,
      recordsWrittenConformed: deliveryProjects.length + deliveryTasks.length + deliverySprints.length,
      recordsProjectedPostgres: projected,
      watermarkEndValue: notionWatermark,
      notes: 'Seeded runtime projections from notion_ops.'
    })

    return {
      syncRunId,
      recordsRead: projects.length + tasks.length + sprints.length,
      recordsWrittenRaw: rawProjectRows.length + rawTaskRows.length + rawSprintRows.length,
      recordsWrittenConformed: deliveryProjects.length + deliveryTasks.length + deliverySprints.length,
      recordsProjectedPostgres: projected,
      watermarkEndValue: notionWatermark
    }
  } catch (error) {
    await writeFailure({
      syncRunId,
      sourceSystem: 'notion',
      sourceObjectType: 'runtime_projection_seed',
      error
    })
    await writeSyncRun({
      syncRunId,
      sourceSystem: 'notion',
      sourceObjectType: 'runtime_projection_seed',
      status: 'failed',
      notes: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

const syncHubspot = async (): Promise<SyncSummary> => {
  const syncRunId = `sync-hubspot-${randomUUID()}`

  await writeSyncRun({
    syncRunId,
    sourceSystem: 'hubspot',
    sourceObjectType: 'runtime_projection_seed',
    status: 'running',
    notes: 'Initial seed from hubspot_crm into raw, conformed and PostgreSQL CRM projections.'
  })

  try {
    const [companies, deals] = await Promise.all([
      runBigQuery<HubspotCompanyRow>(
        `
          SELECT
            hs_object_id,
            name,
            hubspot_owner_id,
            lifecyclestage,
            industry,
            country,
            website,
            linea_de_servicio,
            hs_lastmodifieddate,
            hs_archived
          FROM \`${projectId}.hubspot_crm.companies\`
          WHERE hs_object_id IS NOT NULL
        `
      ),
      runBigQuery<HubspotDealRow>(
        `
          SELECT
            hs_object_id,
            assoc_companies,
            dealname,
            pipeline,
            dealstage,
            pipeline_bucket,
            amount,
            deal_currency_code,
            closedate,
            hubspot_owner_id,
            linea_de_servicio,
            hs_lastmodifieddate,
            hs_is_closed_won,
            hs_is_closed_lost,
            hs_archived
          FROM \`${projectId}.hubspot_crm.deals\`
          WHERE hs_object_id IS NOT NULL
        `
      )
    ])

    const nowIso = new Date().toISOString()

    const rawCompanyRows = companies.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'hubspot',
      source_object_type: 'company',
      source_object_id: toNullableString(row.hs_object_id),
      source_parent_object_id: null,
      source_created_at: null,
      source_updated_at: toTimestampValue(row.hs_lastmodifieddate),
      source_deleted_at: null,
      archived: toBoolean(row.hs_archived),
      is_deleted: toBoolean(row.hs_archived),
      payload_json: JSON.stringify(row),
      payload_hash: buildPayloadHash(row),
      ingested_at: nowIso,
      ingested_date: nowIso.slice(0, 10)
    }))

    const rawDealRows = deals.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'hubspot',
      source_object_type: 'deal',
      source_object_id: toNullableString(row.hs_object_id),
      source_parent_object_id: firstCsvValue(toNullableString(row.assoc_companies)),
      source_created_at: null,
      source_updated_at: toTimestampValue(row.hs_lastmodifieddate),
      source_deleted_at: null,
      archived: toBoolean(row.hs_archived),
      is_deleted: toBoolean(row.hs_archived),
      payload_json: JSON.stringify(row),
      payload_hash: buildPayloadHash(row),
      ingested_at: nowIso,
      ingested_date: nowIso.slice(0, 10)
    }))

    await insertBigQueryRows('greenhouse_raw', 'hubspot_companies_snapshots', rawCompanyRows)
    await insertBigQueryRows('greenhouse_raw', 'hubspot_deals_snapshots', rawDealRows)

    const clientRows = await runGreenhousePostgresQuery<{
      client_id: string
      hubspot_company_id: string | null
    }>(
      `
        SELECT client_id, hubspot_company_id
        FROM greenhouse_core.clients
        WHERE hubspot_company_id IS NOT NULL
      `
    )

    const moduleRows = await runGreenhousePostgresQuery<{
      module_id: string
      module_code: string
    }>(
      `
        SELECT module_id, module_code
        FROM greenhouse_core.service_modules
      `
    )

    const companyClientMap = new Map(
      clientRows
        .map(row => [toNullableString(row.hubspot_company_id), row.client_id] as const)
        .filter(([hubspotCompanyId]) => Boolean(hubspotCompanyId))
    )

    const moduleMap = new Map(
      moduleRows
        .map(row => [normalizeModuleCode(row.module_code), row.module_id] as const)
        .filter(([moduleCode]) => Boolean(moduleCode))
    )

    const crmCompanies = companies.map(row => {
      const companySourceId = toNullableString(row.hs_object_id)

      return {
        company_source_id: companySourceId,
        client_id: companySourceId ? companyClientMap.get(companySourceId) || null : null,
        company_name: toNullableString(row.name) || 'Sin nombre',
        legal_name: toNullableString(row.name),
        owner_source_id: toNullableString(row.hubspot_owner_id),
        owner_user_id: null,
        lifecycle_stage: toNullableString(row.lifecyclestage),
        industry: toNullableString(row.industry),
        country_code: toNullableString(row.country),
        website_url: toNullableString(row.website),
        updated_at: toTimestampValue(row.hs_lastmodifieddate),
        payload_hash: buildPayloadHash(row),
        is_deleted: toBoolean(row.hs_archived),
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    const projectedCompanies = crmCompanies.filter(company => Boolean(company.client_id))

    const crmDeals = deals.map(row => {
      const companySourceId = firstCsvValue(toNullableString(row.assoc_companies))
      const moduleCode = normalizeModuleCode(row.linea_de_servicio)

      return {
        deal_source_id: toNullableString(row.hs_object_id),
        company_source_id: companySourceId,
        client_id: companySourceId ? companyClientMap.get(companySourceId) || null : null,
        pipeline_id: toNullableString(row.pipeline),
        stage_id: toNullableString(row.dealstage),
        stage_name: toNullableString(row.pipeline_bucket) || toNullableString(row.dealstage),
        deal_name: toNullableString(row.dealname) || 'Sin nombre',
        amount: toNumber(row.amount),
        currency: toNullableString(row.deal_currency_code),
        close_date: toDateValue(row.closedate),
        owner_source_id: toNullableString(row.hubspot_owner_id),
        owner_user_id: null,
        module_code: moduleCode,
        module_id: moduleCode ? moduleMap.get(moduleCode) || null : null,
        is_closed_won: toBoolean(row.hs_is_closed_won),
        is_closed_lost: toBoolean(row.hs_is_closed_lost),
        updated_at: toTimestampValue(row.hs_lastmodifieddate),
        payload_hash: buildPayloadHash(row),
        is_deleted: toBoolean(row.hs_archived),
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    const projectedDeals = crmDeals.filter(deal => Boolean(deal.client_id))

    await Promise.all([
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.crm_companies\``,
        location: bigQueryLocation
      }),
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.crm_deals\``,
        location: bigQueryLocation
      })
    ])

    await insertBigQueryRows('greenhouse_conformed', 'crm_companies', crmCompanies)
    await insertBigQueryRows('greenhouse_conformed', 'crm_deals', crmDeals)

    await runGreenhousePostgresQuery(
      `
        DELETE FROM greenhouse_crm.deals
        WHERE client_id IS NULL
      `
    )

    await runGreenhousePostgresQuery(
      `
        DELETE FROM greenhouse_crm.companies
        WHERE client_id IS NULL
      `
    )

    let projected = 0

    for (const company of projectedCompanies) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_crm.companies (
            company_record_id,
            client_id,
            hubspot_company_id,
            company_name,
            legal_name,
            owner_user_id,
            lifecycle_stage,
            industry,
            country_code,
            website_url,
            active,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12::timestamptz, $13::timestamptz, $14, $15)
          ON CONFLICT (hubspot_company_id) DO UPDATE
          SET
            client_id = EXCLUDED.client_id,
            company_name = EXCLUDED.company_name,
            legal_name = EXCLUDED.legal_name,
            owner_user_id = EXCLUDED.owner_user_id,
            lifecycle_stage = EXCLUDED.lifecycle_stage,
            industry = EXCLUDED.industry,
            country_code = EXCLUDED.country_code,
            website_url = EXCLUDED.website_url,
            active = EXCLUDED.active,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `crm-company-${company.company_source_id}`,
          company.client_id,
          company.company_source_id,
          company.company_name,
          company.legal_name,
          company.owner_user_id,
          company.lifecycle_stage,
          company.industry,
          company.country_code,
          company.website_url,
          company.is_deleted,
          company.updated_at,
          company.synced_at,
          syncRunId,
          company.payload_hash
        ]
      )
      projected += 1
    }

    for (const deal of projectedDeals) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_crm.deals (
            deal_record_id,
            client_id,
            company_record_id,
            module_id,
            hubspot_deal_id,
            hubspot_company_id,
            deal_name,
            pipeline_id,
            stage_id,
            stage_name,
            amount,
            currency,
            close_date,
            owner_user_id,
            is_closed_won,
            is_closed_lost,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14, $15, $16, $17, $18::timestamptz, $19::timestamptz, $20, $21)
          ON CONFLICT (hubspot_deal_id) DO UPDATE
          SET
            client_id = EXCLUDED.client_id,
            company_record_id = EXCLUDED.company_record_id,
            module_id = EXCLUDED.module_id,
            hubspot_company_id = EXCLUDED.hubspot_company_id,
            deal_name = EXCLUDED.deal_name,
            pipeline_id = EXCLUDED.pipeline_id,
            stage_id = EXCLUDED.stage_id,
            stage_name = EXCLUDED.stage_name,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            close_date = EXCLUDED.close_date,
            owner_user_id = EXCLUDED.owner_user_id,
            is_closed_won = EXCLUDED.is_closed_won,
            is_closed_lost = EXCLUDED.is_closed_lost,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `crm-deal-${deal.deal_source_id}`,
          deal.client_id,
          deal.company_source_id ? `crm-company-${deal.company_source_id}` : null,
          deal.module_id,
          deal.deal_source_id,
          deal.company_source_id,
          deal.deal_name,
          deal.pipeline_id,
          deal.stage_id,
          deal.stage_name,
          deal.amount,
          deal.currency,
          deal.close_date,
          deal.owner_user_id,
          deal.is_closed_won,
          deal.is_closed_lost,
          deal.is_deleted,
          deal.updated_at,
          deal.synced_at,
          syncRunId,
          deal.payload_hash
        ]
      )
      projected += 1
    }

    const hubspotWatermark = [...companies, ...deals]
      .map(row => toTimestampValue(row.hs_lastmodifieddate))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) || null

    await Promise.all([
      writeWatermark({ sourceSystem: 'hubspot', sourceObjectType: 'companies', value: hubspotWatermark, syncRunId }),
      writeWatermark({ sourceSystem: 'hubspot', sourceObjectType: 'deals', value: hubspotWatermark, syncRunId })
    ])

    await writeSyncRun({
      syncRunId,
      sourceSystem: 'hubspot',
      sourceObjectType: 'runtime_projection_seed',
      status: 'succeeded',
      recordsRead: companies.length + deals.length,
      recordsWrittenRaw: rawCompanyRows.length + rawDealRows.length,
      recordsWrittenConformed: crmCompanies.length + crmDeals.length,
      recordsProjectedPostgres: projected,
      watermarkEndValue: hubspotWatermark,
      notes: 'Seeded runtime projections from hubspot_crm.'
    })

    return {
      syncRunId,
      recordsRead: companies.length + deals.length,
      recordsWrittenRaw: rawCompanyRows.length + rawDealRows.length,
      recordsWrittenConformed: crmCompanies.length + crmDeals.length,
      recordsProjectedPostgres: projected,
      watermarkEndValue: hubspotWatermark
    }
  } catch (error) {
    await writeFailure({
      syncRunId,
      sourceSystem: 'hubspot',
      sourceObjectType: 'runtime_projection_seed',
      error
    })
    await writeSyncRun({
      syncRunId,
      sourceSystem: 'hubspot',
      sourceObjectType: 'runtime_projection_seed',
      status: 'failed',
      notes: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function main() {
  const notion = await syncNotion()
  const hubspot = await syncHubspot()

  console.log(
    JSON.stringify(
      {
        notion,
        hubspot
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error('Unable to seed Greenhouse source sync runtime projections.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
