import 'server-only'

import { query } from '@/lib/db'
import {
  getHubSpotGreenhouseDealMetadata,
  type HubSpotGreenhouseDealMetadataPipeline,
  type HubSpotGreenhouseDealMetadataProperty,
  type HubSpotGreenhouseDealMetadataPropertyOption
} from '@/lib/integrations/hubspot-greenhouse-service'

const DEAL_PROPERTY_ALIASES = {
  dealType: 'dealtype',
  priority: 'hs_priority'
} as const

const DEAL_METADATA_SYNC_TTL_MS = 15 * 60 * 1000

let inFlightDealMetadataSync: Promise<DealMetadataSyncSummary | null> | null = null

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', '1', 'yes'].includes(normalized)) return true
    if (['false', '0', 'no'].includes(normalized)) return false
  }

  return null
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const normalizeOptions = (
  options: HubSpotGreenhouseDealMetadataPropertyOption[] | null | undefined
) =>
  (options ?? [])
    .filter(option => option.value && option.label)
    .map(option => ({
      value: option.value as string,
      label: option.label as string,
      description: option.description ?? null,
      displayOrder: option.displayOrder ?? null,
      hidden: Boolean(option.hidden)
    }))

const buildStageRow = (
  pipeline: HubSpotGreenhouseDealMetadataPipeline,
  stage: HubSpotGreenhouseDealMetadataPipeline['stages'][number]
) => {
  const metadata = stage.metadata ?? {}

  const probabilityPct = parseNumber(
    metadata.probability
      ?? metadata.probabilityPct
      ?? metadata.probability_percent
      ?? null
  )

  const isClosed = parseBoolean(metadata.isClosed ?? metadata.closed ?? metadata.is_closed) ?? stage.archived
  const isWon = isClosed && (probabilityPct === 1 || probabilityPct === 100)

  return {
    pipelineId: pipeline.pipelineId,
    stageId: stage.stageId,
    stageLabel: stage.label ?? stage.stageId,
    probabilityPct,
    isClosed,
    isWon,
    notes: 'HubSpot metadata refresh (TASK-573)',
    pipelineLabel: pipeline.label ?? pipeline.pipelineId,
    pipelineDisplayOrder: pipeline.displayOrder ?? null,
    pipelineActive: !pipeline.archived,
    stageDisplayOrder: stage.displayOrder ?? null,
    isOpenSelectable: !isClosed
  }
}

const upsertPipelineStage = async (
  pipeline: HubSpotGreenhouseDealMetadataPipeline,
  stage: HubSpotGreenhouseDealMetadataPipeline['stages'][number]
) => {
  const row = buildStageRow(pipeline, stage)

  await query(
    `INSERT INTO greenhouse_commercial.hubspot_deal_pipeline_config (
       pipeline_id,
       stage_id,
       stage_label,
       probability_pct,
       is_closed,
       is_won,
       notes,
       pipeline_label,
       pipeline_display_order,
       pipeline_active,
       stage_display_order,
       is_open_selectable
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
     )
     ON CONFLICT (pipeline_id, stage_id) DO UPDATE
       SET stage_label = EXCLUDED.stage_label,
           probability_pct = EXCLUDED.probability_pct,
           is_closed = EXCLUDED.is_closed,
           is_won = EXCLUDED.is_won,
           notes = EXCLUDED.notes,
           pipeline_label = EXCLUDED.pipeline_label,
           pipeline_display_order = EXCLUDED.pipeline_display_order,
           pipeline_active = EXCLUDED.pipeline_active,
           stage_display_order = EXCLUDED.stage_display_order,
           is_open_selectable = EXCLUDED.is_open_selectable,
           updated_at = NOW()`,
    [
      row.pipelineId,
      row.stageId,
      row.stageLabel,
      row.probabilityPct,
      row.isClosed,
      row.isWon,
      row.notes,
      row.pipelineLabel,
      row.pipelineDisplayOrder,
      row.pipelineActive,
      row.stageDisplayOrder,
      row.isOpenSelectable
    ]
  )
}

const upsertPropertyConfig = async (
  propertyName: keyof typeof DEAL_PROPERTY_ALIASES,
  property: HubSpotGreenhouseDealMetadataProperty | null
) => {
  const alias = DEAL_PROPERTY_ALIASES[propertyName]
  const optionsJson = JSON.stringify(normalizeOptions(property?.options))

  await query(
    `INSERT INTO greenhouse_commercial.hubspot_deal_property_config (
       property_name,
       hubspot_property_name,
       label,
       description,
       property_type,
       field_type,
       options_json,
       missing_in_hubspot,
       synced_at,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), $9::jsonb
     )
     ON CONFLICT (property_name) DO UPDATE
       SET hubspot_property_name = EXCLUDED.hubspot_property_name,
           label = EXCLUDED.label,
           description = EXCLUDED.description,
           property_type = EXCLUDED.property_type,
           field_type = EXCLUDED.field_type,
           options_json = EXCLUDED.options_json,
           missing_in_hubspot = EXCLUDED.missing_in_hubspot,
           synced_at = NOW(),
           metadata = EXCLUDED.metadata`,
    [
      propertyName,
      alias,
      property?.label ?? null,
      property
        ? `Mirrored from HubSpot deals property ${alias}`
        : `Expected HubSpot deals property ${alias} is currently missing in this portal`,
      property?.type ?? null,
      property?.fieldType ?? null,
      optionsJson,
      property === null,
      JSON.stringify({
        hubspotDefined: property?.hubspotDefined ?? false
      })
    ]
  )
}

const deactivateStaleStages = async (seenKeys: Set<string>) => {
  const rows = await query<{ pipeline_id: string; stage_id: string }>(
    `SELECT pipeline_id, stage_id
       FROM greenhouse_commercial.hubspot_deal_pipeline_config`
  )

  for (const row of rows) {
    const key = `${row.pipeline_id}::${row.stage_id}`

    if (seenKeys.has(key)) continue

    await query(
      `UPDATE greenhouse_commercial.hubspot_deal_pipeline_config
          SET pipeline_active = FALSE,
              is_open_selectable = FALSE,
              updated_at = NOW()
        WHERE pipeline_id = $1
          AND stage_id = $2`,
      [row.pipeline_id, row.stage_id]
    )
  }
}

export interface DealMetadataSyncSummary {
  objectType: 'deals'
  pipelinesProcessed: number
  stagesProcessed: number
  propertiesProcessed: number
  missingProperties: string[]
  syncedAt: string
}

interface DealMetadataRegistryHealth {
  shouldSync: boolean
  reasons: string[]
  latestPipelineUpdatedAt: string | null
  latestPropertySyncedAt: string | null
}

const toMillis = (value: string | null) => {
  if (!value) return null

  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const getHubSpotDealMetadataRegistryHealth = async (): Promise<DealMetadataRegistryHealth> => {
  const rows = await query<{
    pipeline_count: string | number
    property_count: string | number
    missing_pipeline_label_count: string | number
    missing_stage_order_count: string | number
    latest_pipeline_updated_at: string | null
    latest_property_synced_at: string | null
  }>(
    `WITH pipeline_summary AS (
       SELECT COUNT(DISTINCT pipeline_id)::text AS pipeline_count,
              COUNT(*) FILTER (
                WHERE pipeline_label IS NULL
                   OR btrim(pipeline_label) = ''
                   OR pipeline_label = pipeline_id
              )::text AS missing_pipeline_label_count,
              COUNT(*) FILTER (WHERE stage_display_order IS NULL)::text AS missing_stage_order_count,
              MAX(updated_at)::text AS latest_pipeline_updated_at
         FROM greenhouse_commercial.hubspot_deal_pipeline_config
     ),
     property_summary AS (
       SELECT COUNT(*)::text AS property_count,
              MAX(synced_at)::text AS latest_property_synced_at
         FROM greenhouse_commercial.hubspot_deal_property_config
     )
     SELECT pipeline_summary.pipeline_count,
            property_summary.property_count,
            pipeline_summary.missing_pipeline_label_count,
            pipeline_summary.missing_stage_order_count,
            pipeline_summary.latest_pipeline_updated_at,
            property_summary.latest_property_synced_at
       FROM pipeline_summary, property_summary`
  )

  const row = rows[0]
  const pipelineCount = Number(row?.pipeline_count ?? 0)
  const propertyCount = Number(row?.property_count ?? 0)
  const missingPipelineLabelCount = Number(row?.missing_pipeline_label_count ?? 0)
  const missingStageOrderCount = Number(row?.missing_stage_order_count ?? 0)
  const latestPipelineUpdatedAt = row?.latest_pipeline_updated_at ?? null
  const latestPropertySyncedAt = row?.latest_property_synced_at ?? null
  const now = Date.now()
  const reasons: string[] = []

  if (pipelineCount === 0) reasons.push('no_pipelines_seeded')
  if (propertyCount < 2) reasons.push('property_metadata_incomplete')
  if (missingPipelineLabelCount > 0) reasons.push('pipeline_labels_unhydrated')
  if (missingStageOrderCount > 0) reasons.push('stage_display_order_missing')

  const latestPipelineMs = toMillis(latestPipelineUpdatedAt)
  const latestPropertyMs = toMillis(latestPropertySyncedAt)

  if (pipelineCount > 0 && latestPipelineMs !== null && now - latestPipelineMs > DEAL_METADATA_SYNC_TTL_MS) {
    reasons.push('pipeline_registry_stale')
  }

  if (propertyCount > 0 && latestPropertyMs !== null && now - latestPropertyMs > DEAL_METADATA_SYNC_TTL_MS) {
    reasons.push('property_registry_stale')
  }

  return {
    shouldSync: reasons.length > 0,
    reasons,
    latestPipelineUpdatedAt,
    latestPropertySyncedAt
  }
}

export const syncHubSpotDealMetadata = async (): Promise<DealMetadataSyncSummary> => {
  const metadata = await getHubSpotGreenhouseDealMetadata()
  const seenKeys = new Set<string>()

  for (const pipeline of metadata.pipelines) {
    for (const stage of pipeline.stages) {
      await upsertPipelineStage(pipeline, stage)
      seenKeys.add(`${pipeline.pipelineId}::${stage.stageId}`)
    }
  }

  await deactivateStaleStages(seenKeys)

  await upsertPropertyConfig('dealType', metadata.properties.dealType)
  await upsertPropertyConfig('priority', metadata.properties.priority)

  return {
    objectType: metadata.objectType,
    pipelinesProcessed: metadata.pipelines.length,
    stagesProcessed: metadata.pipelines.reduce((sum, pipeline) => sum + pipeline.stages.length, 0),
    propertiesProcessed: 2,
    missingProperties: (Object.entries(metadata.properties) as Array<[string, HubSpotGreenhouseDealMetadataProperty | null]>)
      .filter(([, property]) => property === null)
      .map(([propertyName]) => propertyName),
    syncedAt: new Date().toISOString()
  }
}

export const ensureHubSpotDealMetadataFresh = async (
  options: { force?: boolean } = {}
): Promise<DealMetadataSyncSummary | null> => {
  if (!options.force) {
    const health = await getHubSpotDealMetadataRegistryHealth()

    if (!health.shouldSync) return null
  }

  if (!inFlightDealMetadataSync) {
    inFlightDealMetadataSync = syncHubSpotDealMetadata().finally(() => {
      inFlightDealMetadataSync = null
    })
  }

  return inFlightDealMetadataSync
}
