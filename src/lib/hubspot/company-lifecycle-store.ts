import 'server-only'

import { getDb } from '@/lib/db'

const HUBSPOT_LIFECYCLE_STAGES = [
  'subscriber',
  'lead',
  'marketingqualifiedlead',
  'salesqualifiedlead',
  'opportunity',
  'customer',
  'evangelist',
  'other',
  'unknown'
] as const

export type ClientLifecycleStage = (typeof HUBSPOT_LIFECYCLE_STAGES)[number]

const LIFECYCLE_STAGE_SET = new Set<string>(HUBSPOT_LIFECYCLE_STAGES)

const LIFECYCLE_STAGE_SOURCES = [
  'hubspot_sync',
  'nubox_fallback',
  'manual_override',
  'unknown'
] as const

export type ClientLifecycleStageSource = (typeof LIFECYCLE_STAGE_SOURCES)[number]

const LIFECYCLE_STAGE_SOURCE_SET = new Set<string>(LIFECYCLE_STAGE_SOURCES)

export interface ClientLifecycleStageSnapshot {
  clientId: string
  hubspotCompanyId: string | null
  stage: ClientLifecycleStage
  source: ClientLifecycleStageSource
  updatedAt: string | null
}

const toIsoString = (value: unknown): string | null => {
  if (value == null) return null

  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return null
}

export const normalizeHubSpotLifecycleStage = (value: string | null | undefined): ClientLifecycleStage => {
  const normalized = value?.trim().toLowerCase() ?? ''

  return LIFECYCLE_STAGE_SET.has(normalized)
    ? normalized as ClientLifecycleStage
    : 'unknown'
}

export const normalizeClientLifecycleStageSource = (
  value: string | null | undefined
): ClientLifecycleStageSource => {
  const normalized = value?.trim().toLowerCase() ?? ''

  return LIFECYCLE_STAGE_SOURCE_SET.has(normalized)
    ? normalized as ClientLifecycleStageSource
    : 'unknown'
}

export const getClientLifecycleStage = async (
  clientId: string
): Promise<ClientLifecycleStageSnapshot | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.clients')
    .select([
      'client_id',
      'hubspot_company_id',
      'lifecyclestage',
      'lifecyclestage_source',
      'lifecyclestage_updated_at'
    ])
    .where('client_id', '=', clientId)
    .executeTakeFirst()

  if (!row) return null

  return {
    clientId: row.client_id,
    hubspotCompanyId: row.hubspot_company_id,
    stage: normalizeHubSpotLifecycleStage(row.lifecyclestage),
    source: normalizeClientLifecycleStageSource(row.lifecyclestage_source),
    updatedAt: toIsoString(row.lifecyclestage_updated_at)
  }
}
