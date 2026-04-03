import 'server-only'

import { createHash } from 'node:crypto'

import { getDb } from '@/lib/db'
import {
  CORE_KPI_CONTRACT,
  OPTIONAL_NOTION_DATABASE_KINDS,
  REQUIRED_NOTION_DATABASE_KINDS,
  buildCoreFieldSuggestions
} from '@/lib/space-notion/notion-governance-contract'
import type {
  NotionCoreFieldSuggestion,
  NotionDatabaseKind,
  NotionGovernanceCoverageItem,
  NotionGovernanceDatabaseStatus,
  NotionGovernanceDriftChange,
  NotionGovernanceDriftEvent,
  NotionGovernanceIssue,
  NotionGovernanceReadiness,
  NotionGovernanceReadinessStatus,
  NotionGovernanceSnapshot,
  NotionGovernanceSummary,
  NotionPropertyDefinition
} from '@/types/notion-governance'
import type { Json } from '@/types/db'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const DEFAULT_NOTION_PIPELINE_URL = 'https://notion-bq-sync-183008134038.us-central1.run.app'

type SpaceSourceRow = {
  source_id: string
  space_id: string
  notion_db_proyectos: string
  notion_db_tareas: string
  notion_db_sprints: string | null
  notion_db_revisiones: string | null
  sync_enabled: boolean
}

type SpacePropertyMappingRow = {
  conformed_field_name: string
  notion_property_name: string
  notion_type: string
  coercion_rule: string
  source_database_key: string
}

type SchemaSnapshotRow = {
  snapshot_id: string
  space_id: string
  source_id: string | null
  database_kind: string
  notion_database_id: string
  database_title: string
  schema_version: number
  schema_hash: string
  property_catalog: unknown
  core_field_suggestions: unknown
  is_current: boolean
  discovered_at: unknown
}

type DriftEventRow = {
  drift_event_id: string
  space_id: string
  database_kind: string
  notion_database_id: string
  drift_status: string
  changes: unknown
  detected_at: unknown
  resolved_at: unknown
}

type ReadinessRow = {
  readiness_id: string
  space_id: string
  source_id: string | null
  contract_version: string
  readiness_status: string
  blocking_issues: unknown
  warnings: unknown
  database_status: unknown
  core_field_coverage: unknown
  mapping_summary: unknown
  evaluated_at: unknown
}

type RefreshedSchema = {
  databaseKind: NotionDatabaseKind
  notionDatabaseId: string
  databaseTitle: string
  properties: Record<string, NotionPropertyDefinition>
  suggestions: NotionCoreFieldSuggestion[]
}

type ReadinessWritePayload = {
  space_id: string
  source_id: string | null
  contract_version: string
  readiness_status: NotionGovernanceReadinessStatus
  blocking_issues: NotionGovernanceIssue[]
  warnings: NotionGovernanceIssue[]
  database_status: NotionGovernanceDatabaseStatus[]
  core_field_coverage: NotionGovernanceCoverageItem[]
  mapping_summary: NotionGovernanceReadiness['mappingSummary']
}

type PipelineDiscoveryDatabase = {
  databaseId: string
  title: string
}

const DATABASE_KIND_ORDER: NotionDatabaseKind[] = ['proyectos', 'tareas', 'sprints', 'revisiones']

const getNotionPipelineUrl = () =>
  (process.env.NOTION_PIPELINE_URL || DEFAULT_NOTION_PIPELINE_URL).replace(/\/$/, '')

const hasNotionToken = () => Boolean(process.env.NOTION_TOKEN?.trim())

const canRefreshSchema = () => hasNotionToken() || Boolean(getNotionPipelineUrl())

const toIso = (value: unknown): string | null => {
  if (value == null) return null

  const date = value instanceof Date ? value : new Date(String(value))

  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

const parseJsonRecord = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback

  return value as T
}

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableJson(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))

    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableJson(val)}`).join(',')}}`
  }

  return JSON.stringify(value)
}

const buildSchemaHash = (
  notionDatabaseId: string,
  properties: Record<string, NotionPropertyDefinition>
) => createHash('sha256').update(stableJson({ notionDatabaseId, properties })).digest('hex')

const notionHeaders = () => {
  const token = process.env.NOTION_TOKEN?.trim()

  if (!token) {
    throw new Error('NOTION_TOKEN not configured')
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  }
}

const inferPropertyTypeFromValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    const firstValue = value.find(item => item != null)

    if (typeof firstValue === 'string' && /^[a-f0-9]{32}$/i.test(firstValue)) return 'relation'
    if (typeof firstValue === 'string' && firstValue.includes('@')) return 'people'

    return 'multi_select'
  }

  if (typeof value === 'boolean') return 'checkbox'
  if (typeof value === 'number') return 'number'

  if (typeof value === 'string') {
    if (value === '[created_time]') return 'created_time'
    if (value === '[created_by]') return 'people'
    if (value === '[unique_id]') return 'formula'
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return 'date'
    if (/^https?:\/\//i.test(value)) return 'url'

    return 'rich_text'
  }

  return 'unknown'
}

const mergeInferredType = (currentType: string | null, nextType: string): string => {
  if (!currentType || currentType === 'unknown') return nextType
  if (nextType === 'unknown' || currentType === nextType) return currentType

  if (currentType === 'number' && nextType === 'formula') return 'formula'
  if (currentType === 'formula' && nextType === 'number') return 'formula'
  if (currentType === 'relation' && nextType === 'multi_select') return 'relation'
  if (currentType === 'multi_select' && nextType === 'relation') return 'relation'

  return 'rich_text'
}

const inferPropertiesFromSamples = (samples: Array<Record<string, unknown>>): Record<string, NotionPropertyDefinition> => {
  const properties: Record<string, NotionPropertyDefinition> = {}

  for (const sample of samples) {
    for (const [propertyName, rawValue] of Object.entries(sample)) {
      const inferredType = inferPropertyTypeFromValue(rawValue)
      const current = properties[propertyName]

      properties[propertyName] = {
        id: current?.id ?? propertyName,
        type: mergeInferredType(current?.type ?? null, inferredType),
        options: current?.options,
        groups: current?.groups,
        expression: current?.expression,
        relationDb: current?.relationDb,
        numberFormat: current?.numberFormat
      }
    }
  }

  return properties
}

const fetchNotionApiDatabaseSchema = async (
  databaseId: string
): Promise<{ title: string; properties: Record<string, NotionPropertyDefinition> }> => {
  const response = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: notionHeaders(),
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new Error(`Notion API ${response.status}: ${text}`)
  }

  const data = await response.json() as Record<string, unknown>
  const titleParts = Array.isArray(data.title) ? data.title as Array<{ plain_text?: string }> : []
  const title = titleParts.find(part => part?.plain_text)?.plain_text || databaseId
  const properties: Record<string, NotionPropertyDefinition> = {}

  for (const [propertyName, config] of Object.entries((data.properties ?? {}) as Record<string, Record<string, unknown>>)) {
    const propertyType = String(config.type || 'unknown')

    const definition: NotionPropertyDefinition = {
      id: String(config.id || propertyName),
      type: propertyType
    }

    if (propertyType === 'select') {
      definition.options = (((config.select as Record<string, unknown>)?.options ?? []) as Array<{ name?: string }>)
        .map(option => option.name)
        .filter((name): name is string => Boolean(name))
    } else if (propertyType === 'multi_select') {
      definition.options = (((config.multi_select as Record<string, unknown>)?.options ?? []) as Array<{ name?: string }>)
        .map(option => option.name)
        .filter((name): name is string => Boolean(name))
    } else if (propertyType === 'status') {
      const statusConfig = (config.status as Record<string, unknown>) ?? {}

      definition.options = ((statusConfig.options ?? []) as Array<{ name?: string }>)
        .map(option => option.name)
        .filter((name): name is string => Boolean(name))
      definition.groups = ((statusConfig.groups ?? []) as Array<{ name?: string }>)
        .map(group => group.name)
        .filter((name): name is string => Boolean(name))
    } else if (propertyType === 'formula') {
      definition.expression = String(((config.formula as Record<string, unknown>)?.expression as string | undefined) ?? '')
    } else if (propertyType === 'relation') {
      definition.relationDb = String(((config.relation as Record<string, unknown>)?.database_id as string | undefined) ?? '')
    } else if (propertyType === 'number') {
      definition.numberFormat = String(((config.number as Record<string, unknown>)?.format as string | undefined) ?? 'number')
    }

    properties[propertyName] = definition
  }

  return { title, properties }
}

const fetchPipelineCatalog = async (): Promise<Map<string, PipelineDiscoveryDatabase>> => {
  const pipelineUrl = getNotionPipelineUrl()

  const response = await fetch(`${pipelineUrl}/discover`, {
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new Error(`Notion pipeline discovery failed (${response.status}): ${text}`)
  }

  const raw = await response.json() as {
    groups?: Array<{
      databases?: Array<{
        database_id?: string
        databaseId?: string
        title?: string
      }>
    }>
  }

  const catalog = new Map<string, PipelineDiscoveryDatabase>()

  for (const group of raw.groups ?? []) {
    for (const database of group.databases ?? []) {
      const databaseId = database.database_id ?? database.databaseId

      if (!databaseId) continue

      catalog.set(databaseId, {
        databaseId,
        title: database.title ?? databaseId
      })
    }
  }

  return catalog
}

const fetchPipelineDatabaseSchema = async (
  databaseId: string,
  databaseTitle?: string
): Promise<{ title: string; properties: Record<string, NotionPropertyDefinition> }> => {
  const pipelineUrl = getNotionPipelineUrl()

  const response = await fetch(`${pipelineUrl}/discover/${encodeURIComponent(databaseId)}/sample?limit=5`, {
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new Error(`Notion pipeline sample failed (${response.status}): ${text}`)
  }

  const raw = await response.json() as {
    sample?: Array<{ properties?: Record<string, unknown> }>
  }

  const samples = (raw.sample ?? [])
    .map(record => record.properties ?? {})
    .filter(record => Object.keys(record).length > 0)

  return {
    title: databaseTitle || databaseId,
    properties: inferPropertiesFromSamples(samples)
  }
}

const fetchNotionDatabaseSchema = async (
  databaseId: string,
  databaseTitle?: string
): Promise<{ title: string; properties: Record<string, NotionPropertyDefinition> }> => {
  if (hasNotionToken()) {
    return fetchNotionApiDatabaseSchema(databaseId)
  }

  return fetchPipelineDatabaseSchema(databaseId, databaseTitle)
}

const mapSnapshotRow = (row: SchemaSnapshotRow): NotionGovernanceSnapshot => {
  const propertyCatalog = parseJsonRecord<Record<string, NotionPropertyDefinition>>(row.property_catalog, {})
  const suggestions = parseJsonRecord<NotionCoreFieldSuggestion[]>(row.core_field_suggestions, [])

  return {
    snapshotId: row.snapshot_id,
    databaseKind: row.database_kind as NotionDatabaseKind,
    notionDatabaseId: row.notion_database_id,
    databaseTitle: row.database_title,
    schemaVersion: row.schema_version,
    schemaHash: row.schema_hash,
    discoveredAt: toIso(row.discovered_at) || '',
    isCurrent: row.is_current,
    propertyCount: Object.keys(propertyCatalog).length,
    suggestions
  }
}

const mapDriftRow = (row: DriftEventRow): NotionGovernanceDriftEvent => ({
  driftEventId: row.drift_event_id,
  databaseKind: row.database_kind as NotionDatabaseKind,
  notionDatabaseId: row.notion_database_id,
  driftStatus: row.drift_status as NotionGovernanceDriftEvent['driftStatus'],
  detectedAt: toIso(row.detected_at) || '',
  resolvedAt: toIso(row.resolved_at),
  changes: parseJsonRecord<NotionGovernanceDriftChange[]>(row.changes, [])
})

const mapReadinessRow = (row: ReadinessRow): NotionGovernanceReadiness => ({
  readinessId: row.readiness_id,
  contractVersion: row.contract_version,
  readinessStatus: row.readiness_status as NotionGovernanceReadinessStatus,
  evaluatedAt: toIso(row.evaluated_at) || '',
  blockingIssues: parseJsonRecord<NotionGovernanceIssue[]>(row.blocking_issues, []),
  warnings: parseJsonRecord<NotionGovernanceIssue[]>(row.warnings, []),
  databaseStatus: parseJsonRecord<NotionGovernanceDatabaseStatus[]>(row.database_status, []),
  coreFieldCoverage: parseJsonRecord<NotionGovernanceCoverageItem[]>(row.core_field_coverage, []),
  mappingSummary: parseJsonRecord<NotionGovernanceReadiness['mappingSummary']>(row.mapping_summary, {
    persistedMappings: 0,
    mappedCoreFields: 0,
    suggestedCoreFields: 0,
    missingCoreFields: 0
  })
})

const comparePropertyCatalogs = ({
  databaseKind,
  notionDatabaseId,
  previousCatalog,
  currentCatalog,
  previousDatabaseId,
  persistedMappings
}: {
  databaseKind: NotionDatabaseKind
  notionDatabaseId: string
  previousCatalog: Record<string, NotionPropertyDefinition>
  currentCatalog: Record<string, NotionPropertyDefinition>
  previousDatabaseId: string
  persistedMappings: SpacePropertyMappingRow[]
}): { driftStatus: NotionGovernanceDriftEvent['driftStatus']; changes: NotionGovernanceDriftChange[] } | null => {
  const changes: NotionGovernanceDriftChange[] = []

  if (previousDatabaseId !== notionDatabaseId) {
    changes.push({
      changeType: 'database_rebound',
      reason: `El binding cambió de ${previousDatabaseId} a ${notionDatabaseId}`
    })
  }

  const previousNames = new Set(Object.keys(previousCatalog))
  const currentNames = new Set(Object.keys(currentCatalog))

  for (const propertyName of currentNames) {
    if (!previousNames.has(propertyName)) {
      changes.push({
        changeType: 'added',
        propertyName,
        currentType: currentCatalog[propertyName]?.type ?? null,
        reason: 'Nueva propiedad detectada en Notion'
      })
    }
  }

  for (const propertyName of previousNames) {
    const previousProperty = previousCatalog[propertyName]
    const currentProperty = currentCatalog[propertyName]

    const mappedField = persistedMappings.find(mapping =>
      mapping.source_database_key === databaseKind && mapping.notion_property_name === propertyName
    )

    const contractField = CORE_KPI_CONTRACT.find(field =>
      field.databaseKind === databaseKind && field.conformedField === mappedField?.conformed_field_name
    )

    if (!currentProperty) {
      changes.push({
        changeType: 'removed',
        propertyName,
        previousType: previousProperty?.type ?? null,
        reason: mappedField && contractField?.required
          ? `Propiedad removida y usada por el contrato KPI requerido (${mappedField.conformed_field_name})`
          : mappedField
            ? `Propiedad removida y usada por el mapping persistido (${mappedField.conformed_field_name})`
            : 'Propiedad removida desde el snapshot anterior'
      })

      continue
    }

    if (previousProperty?.type !== currentProperty.type) {
      changes.push({
        changeType: 'type_changed',
        propertyName,
        previousType: previousProperty?.type ?? null,
        currentType: currentProperty.type,
        reason: mappedField && contractField?.required
          ? `Cambio de tipo sobre propiedad requerida por el contrato KPI (${mappedField.conformed_field_name})`
          : mappedField
            ? `Cambio de tipo sobre propiedad usada por mapping persistido (${mappedField.conformed_field_name})`
            : 'Cambio de tipo detectado en Notion'
      })
    }
  }

  if (changes.length === 0) return null

  let driftStatus: NotionGovernanceDriftEvent['driftStatus'] = 'compatible'

  for (const change of changes) {
    if (change.changeType === 'removed' || change.changeType === 'database_rebound') {
      driftStatus = 'breaking'
      break
    }

    if (change.changeType === 'type_changed') {
      driftStatus = 'warning'
    }
  }

  return { driftStatus, changes }
}

const evaluateSpaceReadiness = ({
  spaceId,
  sourceId,
  snapshots,
  latestDriftEvents,
  persistedMappings
}: {
  spaceId: string
  sourceId: string | null
  snapshots: NotionGovernanceSnapshot[]
  latestDriftEvents: NotionGovernanceDriftEvent[]
  persistedMappings: SpacePropertyMappingRow[]
}): ReadinessWritePayload => {
  const snapshotByKind = new Map(snapshots.map(snapshot => [snapshot.databaseKind, snapshot]))
  const driftByKind = new Map(latestDriftEvents.map(event => [event.databaseKind, event]))
  const suggestionByField = new Map<string, NotionCoreFieldSuggestion>()

  for (const snapshot of snapshots) {
    for (const suggestion of snapshot.suggestions) {
      if (!suggestionByField.has(suggestion.conformedField) || suggestion.confidence === 'HIGH') {
        suggestionByField.set(suggestion.conformedField, suggestion)
      }
    }
  }

  const databaseStatus: NotionGovernanceDatabaseStatus[] = DATABASE_KIND_ORDER.map(databaseKind => {
    const snapshot = snapshotByKind.get(databaseKind) ?? null
    const driftEvent = driftByKind.get(databaseKind) ?? null

    return {
      databaseKind,
      configured: Boolean(snapshot),
      notionDatabaseId: snapshot?.notionDatabaseId ?? null,
      snapshotId: snapshot?.snapshotId ?? null,
      schemaVersion: snapshot?.schemaVersion ?? null,
      databaseTitle: snapshot?.databaseTitle ?? null,
      lastDiscoveredAt: snapshot?.discoveredAt ?? null,
      hasDrift: Boolean(driftEvent),
      driftStatus: driftEvent?.driftStatus ?? null
    }
  })

  const blockingIssues: NotionGovernanceIssue[] = []
  const warnings: NotionGovernanceIssue[] = []

  for (const databaseKind of REQUIRED_NOTION_DATABASE_KINDS) {
    if (!snapshotByKind.has(databaseKind)) {
      blockingIssues.push({
        code: 'required_database_missing',
        databaseKind,
        message: `No hay snapshot activo para la base requerida ${databaseKind}.`
      })
    }
  }

  for (const databaseKind of OPTIONAL_NOTION_DATABASE_KINDS) {
    if (!snapshotByKind.has(databaseKind)) {
      warnings.push({
        code: 'optional_database_missing',
        databaseKind,
        message: `La base opcional ${databaseKind} no está registrada en el schema governance.`
      })
    }
  }

  for (const driftEvent of latestDriftEvents) {
    if (driftEvent.driftStatus === 'breaking') {
      blockingIssues.push({
        code: 'breaking_drift',
        databaseKind: driftEvent.databaseKind,
        message: `Se detectó drift breaking en ${driftEvent.databaseKind}.`
      })
    } else if (driftEvent.driftStatus === 'warning') {
      warnings.push({
        code: 'schema_drift_warning',
        databaseKind: driftEvent.databaseKind,
        message: `Se detectó drift warning en ${driftEvent.databaseKind}.`
      })
    }
  }

  const coreFieldCoverage: NotionGovernanceCoverageItem[] = CORE_KPI_CONTRACT.map(field => {
    const persistedMapping = persistedMappings.find(mapping =>
      mapping.source_database_key === field.databaseKind && mapping.conformed_field_name === field.conformedField
    )

    const suggestion = suggestionByField.get(field.conformedField)

    if (persistedMapping) {
      const item: NotionGovernanceCoverageItem = {
        conformedField: field.conformedField,
        databaseKind: field.databaseKind,
        targetType: field.targetType,
        required: field.required,
        status: 'mapped',
        notionPropertyName: persistedMapping.notion_property_name,
        notionType: persistedMapping.notion_type,
        coercionRule: persistedMapping.coercion_rule,
        source: 'space_property_mappings',
        confidence: suggestion?.notionPropertyName === persistedMapping.notion_property_name ? suggestion.confidence : 'HIGH'
      }

      if (field.required && persistedMapping.coercion_rule !== 'direct') {
        warnings.push({
          code: 'required_field_coercion',
          databaseKind: field.databaseKind,
          conformedField: field.conformedField,
          message: `${field.conformedField} usa coerción ${persistedMapping.coercion_rule}.`
        })
      }

      return item
    }

    if (suggestion) {
      warnings.push({
        code: 'suggested_not_persisted',
        databaseKind: field.databaseKind,
        conformedField: field.conformedField,
        message: `${field.conformedField} depende de una sugerencia ${suggestion.confidence} y aún no está persistido en space_property_mappings.`
      })

      return {
        conformedField: field.conformedField,
        databaseKind: field.databaseKind,
        targetType: field.targetType,
        required: field.required,
        status: 'suggested',
        notionPropertyName: suggestion.notionPropertyName,
        notionType: suggestion.notionType,
        coercionRule: suggestion.coercionRule,
        source: 'schema_suggestion',
        confidence: suggestion.confidence
      }
    }

    if (field.required) {
      blockingIssues.push({
        code: 'required_field_missing',
        databaseKind: field.databaseKind,
        conformedField: field.conformedField,
        message: `Falta cobertura para el campo requerido ${field.conformedField}.`
      })
    }

    return {
      conformedField: field.conformedField,
      databaseKind: field.databaseKind,
      targetType: field.targetType,
      required: field.required,
      status: 'missing',
      notionPropertyName: null,
      notionType: null,
      coercionRule: null,
      source: 'missing',
      confidence: null
    }
  })

  let readinessStatus: NotionGovernanceReadinessStatus = 'ready'

  if (!sourceId) readinessStatus = 'unknown'
  else if (blockingIssues.length > 0) readinessStatus = 'blocked'
  else if (warnings.length > 0) readinessStatus = 'warning'

  return {
    space_id: spaceId,
    source_id: sourceId,
    contract_version: 'notion-kpi-v1',
    readiness_status: readinessStatus,
    blocking_issues: blockingIssues,
    warnings,
    database_status: databaseStatus,
    core_field_coverage: coreFieldCoverage,
    mapping_summary: {
      persistedMappings: persistedMappings.length,
      mappedCoreFields: coreFieldCoverage.filter(item => item.status === 'mapped').length,
      suggestedCoreFields: coreFieldCoverage.filter(item => item.status === 'suggested').length,
      missingCoreFields: coreFieldCoverage.filter(item => item.status === 'missing').length
    }
  }
}

const syncNotionIntegrationGovernanceSummary = async () => {
  const db = await getDb()

  const entry = await db
    .selectFrom('greenhouse_sync.integration_registry')
    .select(['integration_key', 'paused_at', 'metadata'])
    .where('integration_key', '=', 'notion')
    .executeTakeFirst()

  if (!entry || entry.paused_at) return

  const readinessRows = await db
    .selectFrom('greenhouse_sync.notion_space_kpi_readiness as readiness')
    .innerJoin('greenhouse_core.space_notion_sources as sources', 'sources.space_id', 'readiness.space_id')
    .select(['readiness.readiness_status as readiness_status'])
    .where('sources.sync_enabled', '=', true)
    .execute()

  const summary = {
    totalSpaces: readinessRows.length,
    readySpaces: readinessRows.filter(row => row.readiness_status === 'ready').length,
    warningSpaces: readinessRows.filter(row => row.readiness_status === 'warning').length,
    blockedSpaces: readinessRows.filter(row => row.readiness_status === 'blocked').length,
    unknownSpaces: readinessRows.filter(row => row.readiness_status === 'unknown').length,
    evaluatedAt: new Date().toISOString()
  }

  const nextReadinessStatus: NotionGovernanceReadinessStatus =
    summary.totalSpaces === 0
      ? 'unknown'
      : summary.blockedSpaces > 0 || summary.warningSpaces > 0
        ? 'warning'
        : 'ready'

  const metadata = {
    ...(parseJsonRecord<Record<string, unknown>>(entry.metadata, {})),
    notionGovernance: summary
  }

  await db
    .updateTable('greenhouse_sync.integration_registry')
    .set({
      metadata: metadata,
      readiness_status: nextReadinessStatus,
      updated_at: new Date().toISOString()
    })
    .where('integration_key', '=', 'notion')
    .execute()
}

const getSpaceSourceBinding = async (spaceId: string): Promise<SpaceSourceRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.space_notion_sources')
    .select([
      'source_id',
      'space_id',
      'notion_db_proyectos',
      'notion_db_tareas',
      'notion_db_sprints',
      'notion_db_revisiones',
      'sync_enabled'
    ])
    .where('space_id', '=', spaceId)
    .executeTakeFirst()

  return row ?? null
}

const getCurrentSpaceSnapshots = async (spaceId: string): Promise<SchemaSnapshotRow[]> => {
  const db = await getDb()

  return db
    .selectFrom('greenhouse_sync.notion_space_schema_snapshots')
    .selectAll()
    .where('space_id', '=', spaceId)
    .where('is_current', '=', true)
    .execute() as Promise<SchemaSnapshotRow[]>
}

const getPersistedMappings = async (spaceId: string): Promise<SpacePropertyMappingRow[]> => {
  const db = await getDb()

  return db
    .selectFrom('greenhouse_delivery.space_property_mappings')
    .select([
      'conformed_field_name',
      'notion_property_name',
      'notion_type',
      'coercion_rule',
      'source_database_key'
    ])
    .where('space_id', '=', spaceId)
    .execute() as Promise<SpacePropertyMappingRow[]>
}

export const getSpaceNotionGovernance = async (spaceId: string): Promise<NotionGovernanceSummary> => {
  const db = await getDb()
  const source = await getSpaceSourceBinding(spaceId)

  const [snapshots, driftEvents, readiness] = await Promise.all([
    db
      .selectFrom('greenhouse_sync.notion_space_schema_snapshots')
      .selectAll()
      .where('space_id', '=', spaceId)
      .where('is_current', '=', true)
      .orderBy('database_kind', 'asc')
      .execute() as Promise<SchemaSnapshotRow[]>,
    db
      .selectFrom('greenhouse_sync.notion_space_schema_drift_events')
      .selectAll()
      .where('space_id', '=', spaceId)
      .where('resolved_at', 'is', null)
      .orderBy('detected_at', 'desc')
      .execute() as Promise<DriftEventRow[]>,
    db
      .selectFrom('greenhouse_sync.notion_space_kpi_readiness')
      .selectAll()
      .where('space_id', '=', spaceId)
      .executeTakeFirst() as Promise<ReadinessRow | undefined>
  ])

  return {
    spaceId,
    sourceId: source?.source_id ?? null,
    canRefreshSchema: canRefreshSchema(),
    snapshots: snapshots.map(mapSnapshotRow),
    driftEvents: driftEvents.map(mapDriftRow),
    readiness: readiness ? mapReadinessRow(readiness) : null
  }
}

export const getSpaceNotionGovernanceByClientId = async (
  clientId: string
): Promise<NotionGovernanceSummary | null> => {
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select('space_id')
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) return null

  return getSpaceNotionGovernance(space.space_id)
}

export const refreshSpaceNotionGovernance = async (
  spaceId: string,
  actorUserId?: string | null
): Promise<NotionGovernanceSummary> => {
  const source = await getSpaceSourceBinding(spaceId)

  if (!source) {
    throw new Error(`No Notion binding found for space ${spaceId}`)
  }

  if (!canRefreshSchema()) {
    throw new Error('No schema discovery path configured (NOTION_TOKEN or NOTION_PIPELINE_URL)')
  }

  const databaseBindings = DATABASE_KIND_ORDER
    .map(databaseKind => ({
      databaseKind,
      notionDatabaseId:
        databaseKind === 'proyectos'
          ? source.notion_db_proyectos
          : databaseKind === 'tareas'
            ? source.notion_db_tareas
            : databaseKind === 'sprints'
              ? source.notion_db_sprints
              : source.notion_db_revisiones
    }))
    .filter((binding): binding is { databaseKind: NotionDatabaseKind; notionDatabaseId: string } => Boolean(binding.notionDatabaseId))

  const pipelineCatalog = hasNotionToken() ? new Map<string, PipelineDiscoveryDatabase>() : await fetchPipelineCatalog()
  const persistedMappings = await getPersistedMappings(spaceId)
  const currentSnapshots = await getCurrentSpaceSnapshots(spaceId)
  const currentSnapshotByKind = new Map(currentSnapshots.map(snapshot => [snapshot.database_kind as NotionDatabaseKind, snapshot]))
  const boundKinds = new Set(databaseBindings.map(binding => binding.databaseKind))
  const latestDriftEvents: NotionGovernanceDriftEvent[] = []

  const fetchedSchemas = await Promise.all(
    databaseBindings.map(async binding => {
      const knownTitle = pipelineCatalog.get(binding.notionDatabaseId)?.title
      const schema = await fetchNotionDatabaseSchema(binding.notionDatabaseId, knownTitle)

      return {
        databaseKind: binding.databaseKind,
        notionDatabaseId: binding.notionDatabaseId,
        databaseTitle: schema.title || knownTitle || binding.notionDatabaseId,
        properties: schema.properties,
        suggestions: buildCoreFieldSuggestions(binding.databaseKind, schema.properties)
      } satisfies RefreshedSchema
    })
  )

  await (await getDb()).transaction().execute(async trx => {
    for (const snapshot of currentSnapshots) {
      const databaseKind = snapshot.database_kind as NotionDatabaseKind

      if (boundKinds.has(databaseKind)) continue

      await trx
        .updateTable('greenhouse_sync.notion_space_schema_snapshots')
        .set({ is_current: false })
        .where('snapshot_id', '=', snapshot.snapshot_id)
        .execute()

      const driftStatus: NotionGovernanceDriftEvent['driftStatus'] =
        REQUIRED_NOTION_DATABASE_KINDS.includes(databaseKind) ? 'breaking' : 'warning'

      const inserted = await trx
        .insertInto('greenhouse_sync.notion_space_schema_drift_events')
        .values({
          space_id: spaceId,
          database_kind: databaseKind,
          notion_database_id: snapshot.notion_database_id,
          previous_snapshot_id: snapshot.snapshot_id,
          current_snapshot_id: snapshot.snapshot_id,
          drift_status: driftStatus,
          changes: [{
            changeType: 'database_rebound',
            reason: 'El binding de la base fue removido desde space_notion_sources.'
          }] as unknown as Json,
          detected_by: actorUserId ?? null
        })
        .returningAll()
        .executeTakeFirstOrThrow() as DriftEventRow

      latestDriftEvents.push(mapDriftRow(inserted))
    }

    for (const schema of fetchedSchemas) {
      const previousSnapshot = currentSnapshotByKind.get(schema.databaseKind)
      const schemaHash = buildSchemaHash(schema.notionDatabaseId, schema.properties)
      let activeSnapshotRow: SchemaSnapshotRow

      if (
        previousSnapshot &&
        previousSnapshot.schema_hash === schemaHash &&
        previousSnapshot.notion_database_id === schema.notionDatabaseId
      ) {
        activeSnapshotRow = previousSnapshot
      } else {
        if (previousSnapshot) {
          await trx
            .updateTable('greenhouse_sync.notion_space_schema_snapshots')
            .set({ is_current: false })
            .where('snapshot_id', '=', previousSnapshot.snapshot_id)
            .execute()
        }

        const insertedSnapshot = await trx
          .insertInto('greenhouse_sync.notion_space_schema_snapshots')
          .values({
            space_id: spaceId,
            source_id: source.source_id,
            database_kind: schema.databaseKind,
            notion_database_id: schema.notionDatabaseId,
            database_title: schema.databaseTitle,
            schema_version: previousSnapshot ? previousSnapshot.schema_version + 1 : 1,
            schema_hash: schemaHash,
            property_catalog: schema.properties as unknown as Json,
            core_field_suggestions: schema.suggestions as unknown as Json,
            discovered_by: actorUserId ?? null,
            is_current: true
          })
          .returningAll()
          .executeTakeFirstOrThrow() as SchemaSnapshotRow

        activeSnapshotRow = insertedSnapshot

        if (previousSnapshot) {
          const diff = comparePropertyCatalogs({
            databaseKind: schema.databaseKind,
            notionDatabaseId: schema.notionDatabaseId,
            previousCatalog: parseJsonRecord<Record<string, NotionPropertyDefinition>>(previousSnapshot.property_catalog, {}),
            currentCatalog: schema.properties,
            previousDatabaseId: previousSnapshot.notion_database_id,
            persistedMappings
          })

          if (diff) {
            const driftRow = await trx
              .insertInto('greenhouse_sync.notion_space_schema_drift_events')
              .values({
                space_id: spaceId,
                database_kind: schema.databaseKind,
                notion_database_id: schema.notionDatabaseId,
                previous_snapshot_id: previousSnapshot.snapshot_id,
                current_snapshot_id: insertedSnapshot.snapshot_id,
                drift_status: diff.driftStatus,
                changes: diff.changes as unknown as Json,
                detected_by: actorUserId ?? null
              })
              .returningAll()
              .executeTakeFirstOrThrow() as DriftEventRow

            latestDriftEvents.push(mapDriftRow(driftRow))
          }
        }
      }

      if (!latestDriftEvents.some(event => event.databaseKind === schema.databaseKind)) {
        const latestDrift = await trx
          .selectFrom('greenhouse_sync.notion_space_schema_drift_events')
          .selectAll()
          .where('space_id', '=', spaceId)
          .where('database_kind', '=', schema.databaseKind)
          .where('resolved_at', 'is', null)
          .orderBy('detected_at', 'desc')
          .executeTakeFirst() as DriftEventRow | undefined

        if (latestDrift) {
          latestDriftEvents.push(mapDriftRow(latestDrift))
        }
      }

      currentSnapshotByKind.set(schema.databaseKind, activeSnapshotRow)
    }

    const readinessPayload = evaluateSpaceReadiness({
      spaceId,
      sourceId: source.source_id,
      snapshots: Array.from(currentSnapshotByKind.values())
        .filter(snapshot => snapshot.is_current)
        .map(mapSnapshotRow),
      latestDriftEvents,
      persistedMappings
    })

    await trx
      .insertInto('greenhouse_sync.notion_space_kpi_readiness')
      .values({
        ...readinessPayload,
        blocking_issues: readinessPayload.blocking_issues as unknown as Json,
        warnings: readinessPayload.warnings as unknown as Json,
        database_status: readinessPayload.database_status as unknown as Json,
        core_field_coverage: readinessPayload.core_field_coverage as unknown as Json,
        mapping_summary: readinessPayload.mapping_summary as unknown as Json,
        evaluated_by: actorUserId ?? null
      })
      .onConflict(conflict => conflict
        .column('space_id')
        .doUpdateSet({
          source_id: source.source_id,
          contract_version: readinessPayload.contract_version,
          readiness_status: readinessPayload.readiness_status,
          blocking_issues: readinessPayload.blocking_issues as unknown as Json,
          warnings: readinessPayload.warnings as unknown as Json,
          database_status: readinessPayload.database_status as unknown as Json,
          core_field_coverage: readinessPayload.core_field_coverage as unknown as Json,
          mapping_summary: readinessPayload.mapping_summary as unknown as Json,
          evaluated_at: new Date().toISOString(),
          evaluated_by: actorUserId ?? null
        }))
      .execute()
  })

  await syncNotionIntegrationGovernanceSummary()

  return getSpaceNotionGovernance(spaceId)
}
