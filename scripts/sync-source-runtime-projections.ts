import process from 'node:process'
import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

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
  resumen: string | null
  estado: string | null
  finalización: string | null
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
  priorización: string | null
  completitud: string | null
  cumplimiento: string | null
  días_de_retraso: string | null
  días_reprogramados: string | null
  reprogramada: string | null
  indicador_de_performance: string | null
  client_change_round: string | null
  client_change_round_final: string | null
  rpa: string | null
  semáforo_rpa: string | null
  frame_versions: string | null
  frame_comments: string | null
  open_frame_comments: string | null
  client_review_open: boolean | null
  workflow_review_open: boolean | null
  bloqueado_por_ids: string[] | null
  last_frame_comment: string | null
  proyecto_ids: string[] | null
  sprint_ids: string[] | null
  responsable_ids: string[] | null
  responsables_ids: string[] | null
  tarea_principal_ids: string[] | null
  subtareas_ids: string[] | null
  fecha_límite: string | null
  fecha_límite_end: string | null
  fecha_límite_original: string | null
  fecha_límite_original_end: string | null
  fecha_de_completado: string | null
  tiempo_de_ejecución: string | null
  tiempo_en_cambios: string | null
  tiempo_en_revisión: string | null
  workflow_change_round: string | null
  page_url: string | null
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
  tareas_completadas: string | null
  total_de_tareas: string | null
  page_url: string | null
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

type HubspotContactRow = {
  hs_object_id: string | null
  assoc_companies: string | null
  email: string | null
  firstname: string | null
  lastname: string | null
  phone: string | null
  mobilephone: string | null
  jobtitle: string | null
  lifecyclestage: string | null
  hs_lead_status: string | null
  hubspot_owner_id: string | null
  lastmodifieddate: { value?: string } | string | null
  hs_archived: boolean | null
}

const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
const bigQueryLocation = process.env.GREENHOUSE_BIGQUERY_LOCATION || 'US'
const allowLegacyConformedOverwrite = process.env.GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE === 'true'

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

const toYesNoBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = toNullableString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return normalized === 'si' || normalized === 'yes' || normalized === 'true'
}

const normalizePerformanceIndicatorCode = (value: unknown) => {
  const normalized = toNullableString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (!normalized || normalized === '—' || normalized === '-') {
    return null
  }

  if (normalized.includes('on-time') || normalized.includes('on time')) {
    return 'on_time'
  }

  if (normalized.includes('late drop')) {
    return 'late_drop'
  }

  if (normalized.includes('overdue')) {
    return 'overdue'
  }

  if (normalized.includes('carry-over') || normalized.includes('carry over')) {
    return 'carry_over'
  }

  return null
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

const parseCsvValues = (value: string | null) => {
  if (!value) {
    return []
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
    )
  )
}

const mergeNotionRelationIds = (
  primary: string[] | null | undefined,
  fallback: string[] | null | undefined
) => {
  if (primary && primary.length > 0) {
    return primary
  }

  if (fallback && fallback.length > 0) {
    return fallback
  }

  return []
}

const buildPayloadHash = (payload: unknown) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

// ---------------------------------------------------------------------------
// Config-driven property mappings (Conformed Data Layer)
// ---------------------------------------------------------------------------

interface PropertyMapping {
  notionPropertyName: string
  conformedFieldName: string
  notionType: string
  targetType: string
  coercionRule: string
  isRequired: boolean
  fallbackValue: string | null
}

const propertyMappingsCache = new Map<string, PropertyMapping[]>()

const loadPropertyMappings = async (spaceId: string): Promise<PropertyMapping[]> => {
  if (propertyMappingsCache.has(spaceId)) {
    return propertyMappingsCache.get(spaceId)!
  }

  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT notion_property_name, conformed_field_name, notion_type, target_type,
              coercion_rule, is_required, fallback_value
       FROM greenhouse_delivery.space_property_mappings
       WHERE space_id = $1`,
      [spaceId]
    )

    const mappings: PropertyMapping[] = rows.map(r => ({
      notionPropertyName: String(r.notion_property_name ?? ''),
      conformedFieldName: String(r.conformed_field_name ?? ''),
      notionType: String(r.notion_type ?? ''),
      targetType: String(r.target_type ?? ''),
      coercionRule: String(r.coercion_rule ?? 'direct'),
      isRequired: Boolean(r.is_required),
      fallbackValue: r.fallback_value != null ? String(r.fallback_value) : null
    }))

    propertyMappingsCache.set(spaceId, mappings)

    return mappings
  } catch (error) {
    console.warn(`[sync] Failed to load property mappings for space ${spaceId}:`, error instanceof Error ? error.message : error)
    propertyMappingsCache.set(spaceId, [])

    return []
  }
}

const applyCoercion = (value: unknown, rule: string, targetType: string): unknown => {
  if (value === null || value === undefined) return null

  switch (rule) {
    case 'direct':
      return castToTargetType(value, targetType)

    case 'formula_to_int':

    case 'rollup_to_int': {
      const n = toNumber(value)

      return n != null ? Math.round(n) : null
    }

    case 'formula_to_float':
    case 'rollup_to_float':
      return toNumber(value)

    case 'formula_to_string':
    case 'rollup_to_string':
    case 'select_to_string':
    case 'status_to_string':
    case 'number_to_string':
      return toNullableString(value)

    case 'formula_to_bool':
    case 'checkbox_to_bool':
      return toBoolean(value)

    case 'extract_number_from_text': {
      if (typeof value === 'number') return value

      const str = String(value)
      const match = str.match(/[\d]+\.?[\d]*/)

      return match ? parseFloat(match[0]) : null
    }

    case 'relation_first_id':
      return firstCsvValue(toNullableString(value))

    case 'people_first_email': {
      const str = toNullableString(value)

      return str?.includes(',') ? str.split(',')[0].trim() : str
    }

    case 'ignore':
      return undefined

    default:
      console.warn(`[sync] Unknown coercion rule: '${rule}'. Using direct cast.`)

      return castToTargetType(value, targetType)
  }
}

const castToTargetType = (value: unknown, targetType: string): unknown => {
  switch (targetType.toUpperCase()) {
    case 'STRING': return toNullableString(value)

    case 'INTEGER': { const n = toNumber(value);



return n != null ? Math.round(n) : null }

    case 'FLOAT': return toNumber(value)
    case 'BOOLEAN': return toBoolean(value)
    case 'TIMESTAMP': return toTimestampValue(value)
    case 'DATE': return toDateValue(value)
    default: return toNullableString(value)
  }
}

/**
 * Normalize a Notion property name to the BigQuery column format used by notion-bq-sync:
 * lowercase, trim, spaces → underscores, dots → underscores, accented chars → ASCII.
 */
const normalizeNotionKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s.]+/g, '_')

/**
 * Apply config-driven property mappings to a raw Notion row.
 * Returns a partial record with conformed field names and coerced values.
 * Only produces the fields that have explicit mappings.
 */
const applyPropertyMappings = (
  rawRow: Record<string, unknown>,
  mappings: PropertyMapping[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const m of mappings) {
    const sourceKey = normalizeNotionKey(m.notionPropertyName)
    let rawValue: unknown = rawRow[sourceKey]

    // Try exact key if normalized didn't match
    if (rawValue === undefined && sourceKey !== m.notionPropertyName) {
      for (const key of Object.keys(rawRow)) {
        if (normalizeNotionKey(key) === sourceKey) {
          rawValue = rawRow[key]
          break
        }
      }
    }

    if (rawValue !== null && rawValue !== undefined) {
      const coerced = applyCoercion(rawValue, m.coercionRule, m.targetType)

      if (coerced !== undefined) {
        result[m.conformedFieldName] = coerced
      }
    } else if (m.fallbackValue != null) {
      try {
        result[m.conformedFieldName] = m.fallbackValue === 'null' ? null : JSON.parse(m.fallbackValue)
      } catch {
        result[m.conformedFieldName] = m.fallbackValue
      }
    } else {
      if (m.isRequired) {
        console.warn(`[sync] Required field '${m.conformedFieldName}' missing (source: '${m.notionPropertyName}')`)
      }

      result[m.conformedFieldName] = null
    }
  }

  return result
}

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

const replaceBigQueryTableWithLoadJob = async (
  dataset: string,
  table: string,
  rows: Record<string, unknown>[]
) => {
  if (rows.length === 0) {
    await bigQuery.query({
      query: `DELETE FROM \`${projectId}.${dataset}.${table}\` WHERE TRUE`,
      location: bigQueryLocation
    })

    return
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), `greenhouse-bq-${table}-`))
  const tempFilePath = path.join(tempDir, `${table}.jsonl`)

  try {
    const jsonLines = rows.map(row => JSON.stringify(row)).join('\n')

    await writeFile(tempFilePath, `${jsonLines}\n`, 'utf8')
    await bigQuery.dataset(dataset).table(table).load(tempFilePath, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: 'WRITE_TRUNCATE'
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

const ensureDeliveryTaskColumns = async () => {
  const queries = [
    `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS assignee_member_ids ARRAY<STRING>`,
    `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS project_source_ids ARRAY<STRING>`,
    `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`,
    `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS tarea_principal_ids ARRAY<STRING>`,
    `ALTER TABLE \`${projectId}.greenhouse_conformed.delivery_tasks\` ADD COLUMN IF NOT EXISTS subtareas_ids ARRAY<STRING>`
  ]

  for (const sql of queries) {
    try {
      await bigQuery.query({
        query: sql,
        location: bigQueryLocation
      })
    } catch {
      // Column may already exist or ALTER permissions may be restricted.
      // Insert path remains the source of truth for whether the schema is ready.
    }
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
            resumen,
            estado,
            \`finalización\`,
            pct_on_time,
            prioridad,
            rpa_promedio,
            fechas,
            fechas_end,
            page_url,
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
            space_id,
            created_time,
            last_edited_time,
            nombre_de_tarea,
            estado,
            prioridad,
            \`priorización\`,
            completitud,
            cumplimiento,
            \`días_de_retraso\`,
            \`días_reprogramados\`,
            reprogramada,
            indicador_de_performance,
            client_change_round,
            client_change_round_final,
            rpa,
            \`semáforo_rpa\`,
            frame_versions,
            frame_comments,
            open_frame_comments,
            client_review_open,
            workflow_review_open,
            bloqueado_por_ids,
            last_frame_comment,
            proyecto_ids,
            sprint_ids,
            responsable_ids,
            responsables_ids,
            tarea_principal_ids,
            subtareas_ids,
            \`fecha_límite\`,
            \`fecha_límite_end\`,
            \`fecha_límite_original\`,
            \`fecha_límite_original_end\`,
            fecha_de_completado,
            \`tiempo_de_ejecución\`,
            \`tiempo_en_cambios\`,
            \`tiempo_en_revisión\`,
            workflow_change_round,
            page_url
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
            fechas_end,
            tareas_completadas,
            total_de_tareas,
            page_url
          FROM \`${projectId}.notion_ops.sprints\`
          WHERE notion_page_id IS NOT NULL
        `
      )
    ])

    // Primary: resolve space_id via space_notion_sources (canonical, multi-tenant)
    const spaceNotionSources = await runGreenhousePostgresQuery<{
      space_id: string
      notion_db_proyectos: string
      client_id: string | null
    }>(
      `SELECT sns.space_id, sns.notion_db_proyectos, s.client_id
       FROM greenhouse_core.space_notion_sources sns
       JOIN greenhouse_core.spaces s ON s.space_id = sns.space_id
       WHERE sns.sync_enabled = TRUE`
    )

    // Map database_id → space_id (each project reports _source_database_id)
    const databaseSpaceMap = new Map<string, string>()
    const databaseClientMap = new Map<string, string | null>()
    const spaceClientMap = new Map<string, string | null>()

    for (const src of spaceNotionSources) {
      databaseSpaceMap.set(src.notion_db_proyectos, src.space_id)
      databaseClientMap.set(src.notion_db_proyectos, src.client_id)
      spaceClientMap.set(src.space_id, src.client_id)
    }

    // Fallback: legacy clients.notion_project_ids (if no space_notion_sources configured)
    let preferredSpaceMap: Map<string, string> | null = null

    if (databaseSpaceMap.size === 0) {
      console.warn('[sync] No space_notion_sources found — falling back to clients.notion_project_ids')

      const clientBindings = await runBigQuery<ClientNotionBindingRow>(
        `
          SELECT client_id, client_name, notion_project_ids
          FROM \`${projectId}.greenhouse.clients\`
          WHERE notion_project_ids IS NOT NULL
        `
      )

      preferredSpaceMap = buildPreferredSpaceMap(clientBindings)
    } else {
      console.log(`  🗂️  Space resolution via space_notion_sources: ${spaceNotionSources.length} active source(s)`)
    }

    const nowIso = new Date().toISOString()

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


      // Resolve space_id: canonical (database ID → space) or legacy fallback (page ID → space)
      const spaceId = projectDatabaseSourceId
        ? (databaseSpaceMap.get(projectDatabaseSourceId) || preferredSpaceMap?.get(projectSourceId!) || null)
        : (preferredSpaceMap?.get(projectSourceId!) || null)

      const clientId = spaceId
        ? (projectDatabaseSourceId ? (databaseClientMap.get(projectDatabaseSourceId) ?? null) : null) ||
          (spaceClientMap.get(spaceId) ?? null)
        : null

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
        project_summary: toNullableString(row.resumen),
        completion_label: toNullableString(row['finalización']),
        on_time_pct_source: toNumber(row.pct_on_time),
        avg_rpa_source: toNumber(row.rpa_promedio),
        project_phase: null,
        owner_source_id: ownerSourceId,
        owner_member_id: null as string | null,
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

    // Pre-load property mappings for all known spaces (config-driven conformed layer)
    const allSpaceIds = [...new Set(projectSpaceMap.values())].filter(Boolean) as string[]

    await Promise.all(allSpaceIds.map(sid => loadPropertyMappings(sid)))

    const spacesWithMappings = allSpaceIds.filter(sid => (propertyMappingsCache.get(sid) ?? []).length > 0)

    if (spacesWithMappings.length > 0) {
      console.log(`  📋 Config-driven mappings loaded for ${spacesWithMappings.length} space(s): ${spacesWithMappings.join(', ')}`)
    }

    const deliveryTasks = tasks.map(row => {
      const assigneeSourceIds = Array.from(
        new Set(mergeNotionRelationIds(row.responsables_ids, row.responsable_ids).map(id => toNullableString(id)).filter((id): id is string => !!id))
      )

      const assigneeSourceId = assigneeSourceIds[0] || null

      const assigneeMemberIds = assigneeSourceIds
        .map(id => notionMemberMap.get(id))
        .filter((memberId): memberId is string => !!memberId)

      const projectSourceIds = Array.from(
        new Set((row.proyecto_ids || []).map(id => toNullableString(id)).filter((id): id is string => !!id))
      )

      const projectSourceId = projectSourceIds[0] || null
      const sprintSourceId = row.sprint_ids?.[0] || null

      const projectDatabaseSourceId =
        (projectSourceId ? projectDatabaseSourceMap.get(projectSourceId) || null : null) ||
        toNullableString(row._source_database_id)

      const spaceId = (projectSourceId ? projectSpaceMap.get(projectSourceId) || null : null) || toNullableString(row.space_id)

      const clientId =
        (projectSourceId ? projectClientMap.get(projectSourceId) || null : null) ||
        (spaceId ? (spaceClientMap.get(spaceId) ?? null) : null)

      // Default mapping (hardcoded — works for Efeonce and spaces with identical property names)
      const result = {
        task_source_id: toNullableString(row.notion_page_id),
        project_source_id: projectSourceId,
        project_source_ids: projectSourceIds,
        sprint_source_id: sprintSourceId,
        project_database_source_id: projectDatabaseSourceId,
        space_id: spaceId,
        client_source_id: projectDatabaseSourceId,
        client_id: clientId,
        module_code: null as string | null,
        module_id: null as string | null,
        task_name: toNullableString(row.nombre_de_tarea) || 'Sin nombre',
        task_status: toNullableString(row.estado),
        task_phase: toNullableString(row.priorización),
        task_priority: toNullableString(row.prioridad),
        assignee_source_id: assigneeSourceId,
        assignee_member_id: assigneeSourceId ? notionMemberMap.get(assigneeSourceId) || null : null,
        assignee_member_ids: assigneeMemberIds,
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
        tarea_principal_ids: row.tarea_principal_ids ?? [],
        subtareas_ids: row.subtareas_ids ?? [],
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

      // Config-driven override: if this space has property mappings, apply them on top
      const spaceMappings = spaceId ? (propertyMappingsCache.get(spaceId) ?? []) : []

      if (spaceMappings.length > 0) {
        const overrides = applyPropertyMappings(row as unknown as Record<string, unknown>, spaceMappings)

        for (const [key, value] of Object.entries(overrides)) {
          if (key in result) {
            ;(result as Record<string, unknown>)[key] = value
          }
        }
      }

      return result
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
      const completedTasksCount = Math.round(toNumber(row.tareas_completadas) ?? 0)
      const totalTasksCount = Math.round(toNumber(row.total_de_tareas) ?? 0)

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
        completed_tasks_count: completedTasksCount,
        total_tasks_count: totalTasksCount,
        completion_pct_source: totalTasksCount && totalTasksCount > 0 ? Math.round(((completedTasksCount || 0) / totalTasksCount) * 100) : null,
        page_url: toNullableString(row.page_url),
        last_edited_time: toTimestampValue(row.last_edited_time),
        payload_hash: buildPayloadHash(row),
        is_deleted: false,
        sync_run_id: syncRunId,
        synced_at: nowIso
      }
    })

    const sourceAssigneeCountsBySpace = new Map<string, number>()

    for (const row of tasks) {
      const spaceId = toNullableString(row.space_id) || '__NULL__'
      const assigneeIds = mergeNotionRelationIds(row.responsables_ids, row.responsable_ids)

      if (assigneeIds.length > 0) {
        sourceAssigneeCountsBySpace.set(spaceId, (sourceAssigneeCountsBySpace.get(spaceId) ?? 0) + 1)
      }
    }

    const conformedAssigneeCountsBySpace = new Map<string, number>()

    for (const task of deliveryTasks) {
      const spaceId = toNullableString(task.space_id) || '__NULL__'

      if (task.assignee_source_id) {
        conformedAssigneeCountsBySpace.set(spaceId, (conformedAssigneeCountsBySpace.get(spaceId) ?? 0) + 1)
      }
    }

    for (const [spaceId, sourceCount] of sourceAssigneeCountsBySpace.entries()) {
      const conformedCount = conformedAssigneeCountsBySpace.get(spaceId) ?? 0

      if (sourceCount !== conformedCount) {
        throw new Error(
          `Runtime projection lost task assignee attribution for space ${spaceId}: source has ${sourceCount} tasks with responsables but transformed delivery_tasks persisted ${conformedCount} assignee_source_id rows`
        )
      }
    }

    // Safe DELETE pattern: only delete if we have data to replace.
    // Uses DELETE WHERE TRUE (DML) instead of TRUNCATE (DDL) for BigQuery snapshot safety.
    // If notion_ops returned zero tasks, skip the delete to preserve existing conformed data.
    if (deliveryTasks.length === 0) {
      console.warn('[sync] No delivery tasks found — skipping conformed write to preserve existing data')
    } else if (!allowLegacyConformedOverwrite) {
      console.warn('[sync] Skipping conformed overwrite — canonical writer is src/lib/sync/sync-notion-conformed.ts')
    } else {
      await Promise.all([
        bigQuery.query({
          query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_projects\` WHERE TRUE`,
          location: bigQueryLocation
        }),
        bigQuery.query({
          query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` WHERE TRUE`,
          location: bigQueryLocation
        }),
        bigQuery.query({
          query: `DELETE FROM \`${projectId}.greenhouse_conformed.delivery_sprints\` WHERE TRUE`,
          location: bigQueryLocation
        })
      ])

      await ensureDeliveryTaskColumns()

      const normalizedDeliveryTasks = deliveryTasks.map(task => ({
        ...task,
        project_source_ids: task.project_source_ids ?? [],
        assignee_member_ids: task.assignee_member_ids ?? [],
        tarea_principal_ids: task.tarea_principal_ids ?? [],
        subtareas_ids: task.subtareas_ids ?? []
      }))

      await replaceBigQueryTableWithLoadJob('greenhouse_conformed', 'delivery_projects', deliveryProjects)
      await replaceBigQueryTableWithLoadJob('greenhouse_conformed', 'delivery_tasks', normalizedDeliveryTasks)
      await replaceBigQueryTableWithLoadJob('greenhouse_conformed', 'delivery_sprints', deliverySprints)
    }

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
            project_summary,
            completion_label,
            on_time_pct_source,
            avg_rpa_source,
            project_phase,
            owner_member_id,
            start_date,
            end_date,
            page_url,
            active,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, TRUE, $18, $19::timestamptz, $20::timestamptz, $21, $22)
          ON CONFLICT (notion_project_id) DO UPDATE
          SET
            space_id = EXCLUDED.space_id,
            client_id = EXCLUDED.client_id,
            module_id = EXCLUDED.module_id,
            project_database_source_id = EXCLUDED.project_database_source_id,
            project_name = EXCLUDED.project_name,
            project_status = EXCLUDED.project_status,
            project_summary = EXCLUDED.project_summary,
            completion_label = EXCLUDED.completion_label,
            on_time_pct_source = EXCLUDED.on_time_pct_source,
            avg_rpa_source = EXCLUDED.avg_rpa_source,
            project_phase = EXCLUDED.project_phase,
            owner_member_id = EXCLUDED.owner_member_id,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            page_url = EXCLUDED.page_url,
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
          project.project_summary,
          project.completion_label,
          project.on_time_pct_source,
          project.avg_rpa_source,
          project.project_phase,
          project.owner_member_id,
          project.start_date,
          project.end_date,
          project.page_url,
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
            completed_tasks_count,
            total_tasks_count,
            completion_pct_source,
            page_url,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10, $11, $12, $13, $14, $15::timestamptz, $16::timestamptz, $17, $18)
          ON CONFLICT (notion_sprint_id) DO UPDATE
          SET
            project_record_id = EXCLUDED.project_record_id,
            space_id = EXCLUDED.space_id,
            project_database_source_id = EXCLUDED.project_database_source_id,
            sprint_name = EXCLUDED.sprint_name,
            sprint_status = EXCLUDED.sprint_status,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            completed_tasks_count = EXCLUDED.completed_tasks_count,
            total_tasks_count = EXCLUDED.total_tasks_count,
            completion_pct_source = EXCLUDED.completion_pct_source,
            page_url = EXCLUDED.page_url,
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
          sprint.completed_tasks_count,
          sprint.total_tasks_count,
          sprint.completion_pct_source,
          sprint.page_url,
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
            assignee_source_id,
            assignee_member_ids,
            project_database_source_id,
            notion_task_id,
            notion_project_id,
            project_source_ids,
            notion_sprint_id,
            task_name,
            task_status,
            task_phase,
            task_priority,
            completion_label,
            delivery_compliance,
            days_late,
            rescheduled_days,
            is_rescheduled,
            performance_indicator_label,
            performance_indicator_code,
            client_change_round_label,
            client_change_round_final,
            rpa_semaphore_source,
            rpa_value,
            frame_versions,
            frame_comments,
            open_frame_comments,
            client_review_open,
            workflow_review_open,
            blocker_count,
            last_frame_comment,
            tarea_principal_ids,
            subtareas_ids,
            original_due_date,
            execution_time_label,
            changes_time_label,
            review_time_label,
            workflow_change_round,
            due_date,
            completed_at,
            page_url,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13::text[], $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37::text[], $38::text[], $39::date, $40, $41, $42, $43, $44::date, $45::timestamptz, $46, $47, $48::timestamptz, $49::timestamptz, $50, $51)
          ON CONFLICT (notion_task_id) DO UPDATE
          SET
            project_record_id = EXCLUDED.project_record_id,
            sprint_record_id = EXCLUDED.sprint_record_id,
            space_id = EXCLUDED.space_id,
            client_id = EXCLUDED.client_id,
            module_id = EXCLUDED.module_id,
            assignee_member_id = EXCLUDED.assignee_member_id,
            assignee_source_id = EXCLUDED.assignee_source_id,
            assignee_member_ids = EXCLUDED.assignee_member_ids,
            project_database_source_id = EXCLUDED.project_database_source_id,
            notion_project_id = EXCLUDED.notion_project_id,
            project_source_ids = EXCLUDED.project_source_ids,
            notion_sprint_id = EXCLUDED.notion_sprint_id,
            task_name = EXCLUDED.task_name,
            task_status = EXCLUDED.task_status,
            task_phase = EXCLUDED.task_phase,
            task_priority = EXCLUDED.task_priority,
            completion_label = EXCLUDED.completion_label,
            delivery_compliance = EXCLUDED.delivery_compliance,
            days_late = EXCLUDED.days_late,
            rescheduled_days = EXCLUDED.rescheduled_days,
            is_rescheduled = EXCLUDED.is_rescheduled,
            performance_indicator_label = EXCLUDED.performance_indicator_label,
            performance_indicator_code = EXCLUDED.performance_indicator_code,
            client_change_round_label = EXCLUDED.client_change_round_label,
            client_change_round_final = EXCLUDED.client_change_round_final,
            rpa_semaphore_source = EXCLUDED.rpa_semaphore_source,
            rpa_value = EXCLUDED.rpa_value,
            frame_versions = EXCLUDED.frame_versions,
            frame_comments = EXCLUDED.frame_comments,
            open_frame_comments = EXCLUDED.open_frame_comments,
            client_review_open = EXCLUDED.client_review_open,
            workflow_review_open = EXCLUDED.workflow_review_open,
            blocker_count = EXCLUDED.blocker_count,
            last_frame_comment = EXCLUDED.last_frame_comment,
            tarea_principal_ids = EXCLUDED.tarea_principal_ids,
            subtareas_ids = EXCLUDED.subtareas_ids,
            original_due_date = EXCLUDED.original_due_date,
            execution_time_label = EXCLUDED.execution_time_label,
            changes_time_label = EXCLUDED.changes_time_label,
            review_time_label = EXCLUDED.review_time_label,
            workflow_change_round = EXCLUDED.workflow_change_round,
            due_date = EXCLUDED.due_date,
            completed_at = EXCLUDED.completed_at,
            page_url = EXCLUDED.page_url,
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
          task.assignee_source_id,
          task.assignee_member_ids,
          task.project_database_source_id,
          task.task_source_id,
          task.project_source_id,
          task.project_source_ids,
          task.sprint_source_id,
          task.task_name,
          task.task_status,
          task.task_phase,
          task.task_priority,
          task.completion_label,
          task.delivery_compliance,
          task.days_late,
          task.rescheduled_days,
          task.is_rescheduled,
          task.performance_indicator_label,
          task.performance_indicator_code,
          task.client_change_round_label,
          task.client_change_round_final,
          task.rpa_semaphore_source,
          task.rpa_value,
          task.frame_versions,
          task.frame_comments,
          task.open_frame_comments,
          task.client_review_open,
          task.workflow_review_open,
          task.blocker_count,
          task.last_frame_comment,
          task.tarea_principal_ids,
          task.subtareas_ids,
          task.original_due_date,
          task.execution_time_label,
          task.changes_time_label,
          task.review_time_label,
          task.workflow_change_round,
          task.due_date,
          task.completed_at,
          task.page_url,
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
      recordsWrittenConformed: allowLegacyConformedOverwrite
        ? deliveryProjects.length + deliveryTasks.length + deliverySprints.length
        : 0,
      recordsProjectedPostgres: projected,
      watermarkEndValue: notionWatermark,
      notes: allowLegacyConformedOverwrite
        ? 'Seeded runtime projections from notion_ops.'
        : 'Seeded raw/runtime projections from notion_ops. Conformed overwrite skipped because sync-notion-conformed is canonical.'
    })

    return {
      syncRunId,
      recordsRead: projects.length + tasks.length + sprints.length,
      recordsWrittenRaw: rawProjectRows.length + rawTaskRows.length + rawSprintRows.length,
      recordsWrittenConformed: allowLegacyConformedOverwrite
        ? deliveryProjects.length + deliveryTasks.length + deliverySprints.length
        : 0,
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
    const [companies, deals, contacts] = await Promise.all([
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
      ),
      runBigQuery<HubspotContactRow>(
        `
          SELECT
            hs_object_id,
            assoc_companies,
            email,
            firstname,
            lastname,
            phone,
            mobilephone,
            jobtitle,
            lifecyclestage,
            hs_lead_status,
            hubspot_owner_id,
            lastmodifieddate,
            hs_archived
          FROM \`${projectId}.hubspot_crm.contacts\`
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

    const rawContactRows = contacts.map(row => ({
      sync_run_id: syncRunId,
      source_system: 'hubspot',
      source_object_type: 'contact',
      source_object_id: toNullableString(row.hs_object_id),
      source_parent_object_id: firstCsvValue(toNullableString(row.assoc_companies)),
      source_created_at: null,
      source_updated_at: toTimestampValue(row.lastmodifieddate),
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
    await insertBigQueryRows('greenhouse_raw', 'hubspot_contacts_snapshots', rawContactRows)

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
        owner_member_id: null as string | null,
        owner_user_id: null as string | null,
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

    // Keep the CRM company mirror complete, even when the company is still a
    // pure prospect without a Greenhouse client binding. Deals/contacts remain
    // client-scoped below until their own lanes are widened.
    const projectedCompanies = crmCompanies.filter(company => Boolean(company.client_id))
    const projectedCompanyIds = new Set(projectedCompanies.map(company => company.company_source_id).filter(Boolean))

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
        owner_member_id: null as string | null,
        owner_user_id: null as string | null,
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

    const runtimeUsers = await runGreenhousePostgresQuery<{
      user_id: string
      client_id: string | null
      email: string | null
      identity_profile_id: string | null
    }>(
      `
        SELECT user_id, client_id, email, identity_profile_id
        FROM greenhouse_core.client_users
        WHERE email IS NOT NULL
      `
    )

    const runtimeProfiles = await runGreenhousePostgresQuery<{
      profile_id: string
      canonical_email: string | null
    }>(
      `
        SELECT profile_id, canonical_email
        FROM greenhouse_core.identity_profiles
      `
    )

    const hubspotProfileLinks = await runGreenhousePostgresQuery<{
      profile_id: string
      source_object_id: string
    }>(
      `
        SELECT profile_id, source_object_id
        FROM greenhouse_core.identity_profile_source_links
        WHERE source_system = 'hubspot'
          AND source_object_type = 'contact'
      `
    )

    const hubspotUserLinks = await runGreenhousePostgresQuery<{
      entity_id: string
      source_object_id: string
    }>(
      `
        SELECT entity_id, source_object_id
        FROM greenhouse_core.entity_source_links
        WHERE entity_type = 'user'
          AND source_system = 'hubspot'
          AND source_object_type = 'contact'
      `
    )

    const userById = new Map(runtimeUsers.map(user => [user.user_id, user]))
    const userByClientEmail = new Map<string, typeof runtimeUsers>()

    for (const user of runtimeUsers) {
      const email = toNullableString(user.email)?.toLowerCase()
      const clientId = toNullableString(user.client_id)

      if (!email || !clientId) {
        continue
      }

      const key = `${clientId}::${email}`
      const existing = userByClientEmail.get(key) || []

      userByClientEmail.set(key, [...existing, user])
    }

    const uniqueUserByClientEmail = new Map<string, (typeof runtimeUsers)[number]>()

    for (const [key, users] of userByClientEmail.entries()) {
      if (users.length === 1) {
        uniqueUserByClientEmail.set(key, users[0])
      }
    }

    const profileByEmail = new Map<string, typeof runtimeProfiles>()

    for (const profile of runtimeProfiles) {
      const email = toNullableString(profile.canonical_email)?.toLowerCase()

      if (!email) {
        continue
      }

      const existing = profileByEmail.get(email) || []

      profileByEmail.set(email, [...existing, profile])
    }

    const uniqueProfileByEmail = new Map<string, (typeof runtimeProfiles)[number]>()

    for (const [email, profiles] of profileByEmail.entries()) {
      if (profiles.length === 1) {
        uniqueProfileByEmail.set(email, profiles[0])
      }
    }

    const uniqueUserByEmail = new Map<string, (typeof runtimeUsers)[number]>()
    const usersByEmail = new Map<string, typeof runtimeUsers>()

    for (const user of runtimeUsers) {
      const email = toNullableString(user.email)?.toLowerCase()

      if (!email) {
        continue
      }

      const existing = usersByEmail.get(email) || []

      usersByEmail.set(email, [...existing, user])
    }

    for (const [email, users] of usersByEmail.entries()) {
      if (users.length === 1) {
        uniqueUserByEmail.set(email, users[0])
      }
    }

    const profileByHubspotContactId = new Map(
      hubspotProfileLinks.map(link => [link.source_object_id, link.profile_id] as const)
    )

    const userByHubspotContactId = new Map(
      hubspotUserLinks.map(link => [link.source_object_id, link.entity_id] as const)
    )

    const ownerMemberRows = await runBigQuery<{
      member_id: string | null
      display_name: string | null
      email: string | null
      identity_profile_id: string | null
      hubspot_owner_id: string | null
    }>(
      `
        SELECT member_id, display_name, email, identity_profile_id, hubspot_owner_id
        FROM \`${projectId}.greenhouse.team_members\`
        WHERE hubspot_owner_id IS NOT NULL
      `
    )

    const ownerMemberBySourceId = new Map<
      string,
      {
        memberId: string
        displayName: string | null
        email: string | null
        identityProfileId: string | null
        userId: string | null
      }
    >()

    for (const row of ownerMemberRows) {
      const ownerSourceId = toNullableString(row.hubspot_owner_id)
      const memberId = toNullableString(row.member_id)

      if (!ownerSourceId || !memberId) {
        continue
      }

      ownerMemberBySourceId.set(ownerSourceId, {
        memberId,
        displayName: toNullableString(row.display_name),
        email: toNullableString(row.email)?.toLowerCase() || null,
        identityProfileId: toNullableString(row.identity_profile_id),
        userId: null
      })
    }

    for (const owner of ownerMemberBySourceId.values()) {
      owner.userId = owner.email ? uniqueUserByEmail.get(owner.email)?.user_id || null : null
    }

    for (const [ownerSourceId, owner] of ownerMemberBySourceId.entries()) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_core.entity_source_links (
            link_id,
            entity_type,
            entity_id,
            source_system,
            source_object_type,
            source_object_id,
            source_display_name,
            is_primary,
            active
          )
          VALUES ($1, 'member', $2, 'hubspot', 'owner', $3, $4, TRUE, TRUE)
          ON CONFLICT (entity_type, entity_id, source_system, source_object_type, source_object_id) DO UPDATE
          SET
            source_display_name = EXCLUDED.source_display_name,
            is_primary = EXCLUDED.is_primary,
            active = EXCLUDED.active,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `member-link-hubspot-owner-${ownerSourceId}`,
          owner.memberId,
          ownerSourceId,
          owner.displayName || owner.email || owner.memberId
        ]
      )

      if (owner.userId) {
        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_core.entity_source_links (
              link_id,
              entity_type,
              entity_id,
              source_system,
              source_object_type,
              source_object_id,
              source_display_name,
              is_primary,
              active
            )
            VALUES ($1, 'user', $2, 'hubspot', 'owner', $3, $4, TRUE, TRUE)
            ON CONFLICT (entity_type, entity_id, source_system, source_object_type, source_object_id) DO UPDATE
            SET
              source_display_name = EXCLUDED.source_display_name,
              is_primary = EXCLUDED.is_primary,
              active = EXCLUDED.active,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            `user-link-hubspot-owner-${ownerSourceId}`,
            owner.userId,
            ownerSourceId,
            owner.displayName || owner.email || owner.memberId
          ]
        )
      }

      if (owner.identityProfileId) {
        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_core.identity_profile_source_links (
              link_id,
              profile_id,
              source_system,
              source_object_type,
              source_object_id,
              source_email,
              source_display_name,
              is_primary,
              is_login_identity,
              active
            )
            VALUES ($1, $2, 'hubspot', 'owner', $3, $4, $5, TRUE, FALSE, TRUE)
            ON CONFLICT (profile_id, source_system, source_object_type, source_object_id) DO UPDATE
            SET
              source_email = EXCLUDED.source_email,
              source_display_name = EXCLUDED.source_display_name,
              is_primary = EXCLUDED.is_primary,
              active = EXCLUDED.active,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            `profile-link-hubspot-owner-${ownerSourceId}`,
            owner.identityProfileId,
            ownerSourceId,
            owner.email,
            owner.displayName || owner.email || owner.memberId
          ]
        )
      }
    }

    for (const company of crmCompanies) {
      const owner = company.owner_source_id ? ownerMemberBySourceId.get(company.owner_source_id) || null : null

      company.owner_member_id = owner?.memberId || null
      company.owner_user_id = owner?.userId || null
    }

    for (const deal of crmDeals) {
      const owner = deal.owner_source_id ? ownerMemberBySourceId.get(deal.owner_source_id) || null : null

      deal.owner_member_id = owner?.memberId || null
      deal.owner_user_id = owner?.userId || null
    }

    const resolvePrimaryCompanySourceId = (assocCompanies: string | null) => {
      const candidates = parseCsvValues(assocCompanies)

      for (const candidate of candidates) {
        if (projectedCompanyIds.has(candidate)) {
          return candidate
        }
      }

      return null
    }

    const crmContacts = contacts
      .map(row => {
        const contactSourceId = toNullableString(row.hs_object_id)
        const associatedCompanySourceIds = parseCsvValues(toNullableString(row.assoc_companies))
        const companySourceId = resolvePrimaryCompanySourceId(toNullableString(row.assoc_companies))
        const clientId = companySourceId ? companyClientMap.get(companySourceId) || null : null
        const email = toNullableString(row.email)?.toLowerCase() || null
        const canonicalUserId = contactSourceId ? `user-hubspot-contact-${contactSourceId}` : null

        const linkedByCanonicalUser =
          canonicalUserId && userById.has(canonicalUserId) ? userById.get(canonicalUserId) || null : null

        const linkedBySourceLink =
          contactSourceId && userByHubspotContactId.has(contactSourceId)
            ? userById.get(userByHubspotContactId.get(contactSourceId) || '') || null
            : null

        const linkedByEmail =
          clientId && email ? uniqueUserByClientEmail.get(`${clientId}::${email}`) || null : null

        const linkedUser = linkedByCanonicalUser || linkedBySourceLink || linkedByEmail

        const linkedIdentityProfileId =
          linkedUser?.identity_profile_id ||
          (contactSourceId ? profileByHubspotContactId.get(contactSourceId) || null : null) ||
          (email ? uniqueProfileByEmail.get(email)?.profile_id || null : null)

        const firstName = toNullableString(row.firstname)
        const lastName = toNullableString(row.lastname)

        const displayName =
          [firstName, lastName].filter(Boolean).join(' ').trim() || email || `HubSpot Contact ${contactSourceId || ''}`.trim()

        return {
          contact_source_id: contactSourceId,
          company_source_id: companySourceId,
          associated_company_source_ids: associatedCompanySourceIds,
          client_id: clientId,
          linked_user_id: linkedUser?.user_id || null,
          linked_identity_profile_id: linkedIdentityProfileId,
          email,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          job_title: toNullableString(row.jobtitle),
          phone: toNullableString(row.phone),
          mobile_phone: toNullableString(row.mobilephone),
          lifecycle_stage: toNullableString(row.lifecyclestage),
          lead_status: toNullableString(row.hs_lead_status),
          owner_source_id: toNullableString(row.hubspot_owner_id),
          owner_member_id:
            toNullableString(row.hubspot_owner_id)
              ? ownerMemberBySourceId.get(toNullableString(row.hubspot_owner_id) || '')?.memberId || null
              : null,
          owner_user_id:
            toNullableString(row.hubspot_owner_id)
              ? ownerMemberBySourceId.get(toNullableString(row.hubspot_owner_id) || '')?.userId || null
              : null,
          updated_at: toTimestampValue(row.lastmodifieddate),
          payload_hash: buildPayloadHash(row),
          is_deleted: toBoolean(row.hs_archived),
          sync_run_id: syncRunId,
          synced_at: nowIso
        }
      })
      .filter(contact => Boolean(contact.company_source_id && contact.client_id))

    await Promise.all([
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.crm_companies\``,
        location: bigQueryLocation
      }),
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.crm_deals\``,
        location: bigQueryLocation
      }),
      bigQuery.query({
        query: `TRUNCATE TABLE \`${projectId}.greenhouse_conformed.crm_contacts\``,
        location: bigQueryLocation
      })
    ])

    await insertBigQueryRows('greenhouse_conformed', 'crm_companies', crmCompanies)
    await insertBigQueryRows('greenhouse_conformed', 'crm_deals', crmDeals)
    await insertBigQueryRows('greenhouse_conformed', 'crm_contacts', crmContacts)

    await runGreenhousePostgresQuery(
      `
        DELETE FROM greenhouse_crm.deals
        WHERE client_id IS NULL
      `
    )

    await runGreenhousePostgresQuery(
      `
        DELETE FROM greenhouse_crm.contacts
        WHERE client_id IS NULL
      `
    )

    let projected = 0

    for (const company of crmCompanies) {
      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_crm.companies (
            company_record_id,
            client_id,
            hubspot_company_id,
            company_name,
            legal_name,
            owner_member_id,
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, $13::timestamptz, $14::timestamptz, $15, $16)
          ON CONFLICT (hubspot_company_id) DO UPDATE
          SET
            client_id = EXCLUDED.client_id,
            company_name = EXCLUDED.company_name,
            legal_name = EXCLUDED.legal_name,
            owner_member_id = EXCLUDED.owner_member_id,
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
          company.owner_member_id,
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
            owner_member_id,
            owner_user_id,
            is_closed_won,
            is_closed_lost,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14, $15, $16, $17, $18, $19::timestamptz, $20::timestamptz, $21, $22)
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
            owner_member_id = EXCLUDED.owner_member_id,
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
          deal.owner_member_id,
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

    for (const contact of crmContacts) {
      let linkedIdentityProfileId = contact.linked_identity_profile_id

      if (contact.linked_user_id && !linkedIdentityProfileId && contact.contact_source_id) {
        linkedIdentityProfileId = `profile-hubspot-contact-${contact.contact_source_id}`

        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_core.identity_profiles (
              profile_id,
              profile_type,
              canonical_email,
              full_name,
              job_title,
              status,
              active,
              default_auth_mode,
              primary_source_system,
              primary_source_object_type,
              primary_source_object_id,
              notes
            )
            VALUES ($1, 'external_contact', $2, $3, $4, 'active', TRUE, 'hubspot_contact', 'hubspot', 'contact', $5, 'Created by source sync contact reconciliation.')
            ON CONFLICT (profile_id) DO UPDATE
            SET
              canonical_email = EXCLUDED.canonical_email,
              full_name = EXCLUDED.full_name,
              job_title = EXCLUDED.job_title,
              status = EXCLUDED.status,
              active = EXCLUDED.active,
              primary_source_system = EXCLUDED.primary_source_system,
              primary_source_object_type = EXCLUDED.primary_source_object_type,
              primary_source_object_id = EXCLUDED.primary_source_object_id,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            linkedIdentityProfileId,
            contact.email,
            contact.display_name,
            contact.job_title,
            contact.contact_source_id
          ]
        )
      }

      if (linkedIdentityProfileId && contact.contact_source_id) {
        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_core.identity_profile_source_links (
              link_id,
              profile_id,
              source_system,
              source_object_type,
              source_object_id,
              source_email,
              source_display_name,
              is_primary,
              is_login_identity,
              active
            )
            VALUES ($1, $2, 'hubspot', 'contact', $3, $4, $5, TRUE, FALSE, TRUE)
            ON CONFLICT (profile_id, source_system, source_object_type, source_object_id) DO UPDATE
            SET
              source_email = EXCLUDED.source_email,
              source_display_name = EXCLUDED.source_display_name,
              is_primary = EXCLUDED.is_primary,
              active = EXCLUDED.active,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            `profile-link-hubspot-contact-${contact.contact_source_id}`,
            linkedIdentityProfileId,
            contact.contact_source_id,
            contact.email,
            contact.display_name
          ]
        )
      }

      if (contact.linked_user_id && contact.contact_source_id) {
        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_core.entity_source_links (
              link_id,
              entity_type,
              entity_id,
              source_system,
              source_object_type,
              source_object_id,
              source_display_name,
              is_primary,
              active
            )
            VALUES ($1, 'user', $2, 'hubspot', 'contact', $3, $4, TRUE, TRUE)
            ON CONFLICT (entity_type, entity_id, source_system, source_object_type, source_object_id) DO UPDATE
            SET
              source_display_name = EXCLUDED.source_display_name,
              is_primary = EXCLUDED.is_primary,
              active = EXCLUDED.active,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            `user-link-hubspot-contact-${contact.contact_source_id}`,
            contact.linked_user_id,
            contact.contact_source_id,
            contact.display_name
          ]
        )

        if (linkedIdentityProfileId) {
          await runGreenhousePostgresQuery(
            `
              UPDATE greenhouse_core.client_users
              SET
                identity_profile_id = COALESCE(identity_profile_id, $2),
                updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $1
            `,
            [contact.linked_user_id, linkedIdentityProfileId]
          )
        }
      }

      await runGreenhousePostgresQuery(
        `
          INSERT INTO greenhouse_crm.contacts (
            contact_record_id,
            client_id,
            company_record_id,
            linked_user_id,
            linked_identity_profile_id,
            hubspot_contact_id,
            hubspot_primary_company_id,
            hubspot_associated_company_ids,
            email,
            first_name,
            last_name,
            display_name,
            job_title,
            phone,
            mobile_phone,
            lifecycle_stage,
            lead_status,
            owner_member_id,
            owner_user_id,
            active,
            is_deleted,
            source_updated_at,
            synced_at,
            sync_run_id,
            payload_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE, $20, $21::timestamptz, $22::timestamptz, $23, $24)
          ON CONFLICT (hubspot_contact_id) DO UPDATE
          SET
            client_id = EXCLUDED.client_id,
            company_record_id = EXCLUDED.company_record_id,
            linked_user_id = EXCLUDED.linked_user_id,
            linked_identity_profile_id = EXCLUDED.linked_identity_profile_id,
            hubspot_primary_company_id = EXCLUDED.hubspot_primary_company_id,
            hubspot_associated_company_ids = EXCLUDED.hubspot_associated_company_ids,
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            display_name = EXCLUDED.display_name,
            job_title = EXCLUDED.job_title,
            phone = EXCLUDED.phone,
            mobile_phone = EXCLUDED.mobile_phone,
            lifecycle_stage = EXCLUDED.lifecycle_stage,
            lead_status = EXCLUDED.lead_status,
            owner_member_id = EXCLUDED.owner_member_id,
            owner_user_id = EXCLUDED.owner_user_id,
            active = EXCLUDED.active,
            is_deleted = EXCLUDED.is_deleted,
            source_updated_at = EXCLUDED.source_updated_at,
            synced_at = EXCLUDED.synced_at,
            sync_run_id = EXCLUDED.sync_run_id,
            payload_hash = EXCLUDED.payload_hash,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          `crm-contact-${contact.contact_source_id}`,
          contact.client_id,
          contact.company_source_id ? `crm-company-${contact.company_source_id}` : null,
          contact.linked_user_id,
          linkedIdentityProfileId,
          contact.contact_source_id,
          contact.company_source_id,
          contact.associated_company_source_ids,
          contact.email,
          contact.first_name,
          contact.last_name,
          contact.display_name,
          contact.job_title,
          contact.phone,
          contact.mobile_phone,
          contact.lifecycle_stage,
          contact.lead_status,
          contact.owner_member_id,
          contact.owner_user_id,
          contact.is_deleted,
          contact.updated_at,
          contact.synced_at,
          syncRunId,
          contact.payload_hash
        ]
      )
      projected += 1
    }

    const hubspotWatermark = [...companies, ...deals, ...contacts]
      .map(row => toTimestampValue('lastmodifieddate' in row ? row.lastmodifieddate : row.hs_lastmodifieddate))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) || null

    await Promise.all([
      writeWatermark({ sourceSystem: 'hubspot', sourceObjectType: 'companies', value: hubspotWatermark, syncRunId }),
      writeWatermark({ sourceSystem: 'hubspot', sourceObjectType: 'deals', value: hubspotWatermark, syncRunId }),
      writeWatermark({ sourceSystem: 'hubspot', sourceObjectType: 'contacts', value: hubspotWatermark, syncRunId })
    ])

    await writeSyncRun({
      syncRunId,
      sourceSystem: 'hubspot',
      sourceObjectType: 'runtime_projection_seed',
      status: 'succeeded',
      recordsRead: companies.length + deals.length + contacts.length,
      recordsWrittenRaw: rawCompanyRows.length + rawDealRows.length + rawContactRows.length,
      recordsWrittenConformed: crmCompanies.length + crmDeals.length + crmContacts.length,
      recordsProjectedPostgres: projected,
      watermarkEndValue: hubspotWatermark,
      notes: 'Seeded runtime projections from hubspot_crm.'
    })

    return {
      syncRunId,
      recordsRead: companies.length + deals.length + contacts.length,
      recordsWrittenRaw: rawCompanyRows.length + rawDealRows.length + rawContactRows.length,
      recordsWrittenConformed: crmCompanies.length + crmDeals.length + crmContacts.length,
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
