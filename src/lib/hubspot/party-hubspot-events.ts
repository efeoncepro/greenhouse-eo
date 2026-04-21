import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export interface PartyHubSpotSyncedPayload {
  commercialPartyId: string
  organizationId: string
  hubspotCompanyId: string
  lifecycleStage: string | null
  fieldsWritten: string[]
  syncedAt: string
  endpointNotDeployed?: boolean
}

export interface PartyHubSpotConflictPayload {
  commercialPartyId: string | null
  organizationId: string | null
  hubspotCompanyId: string | null
  conflictType: string
  conflictingFields: Record<string, unknown> | null
  resolutionApplied: string
  detectedAt: string
}

export const publishPartyHubSpotSynced = async (
  payload: PartyHubSpotSyncedPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialParty,
      aggregateId: payload.commercialPartyId,
      eventType: EVENT_TYPES.commercialPartyHubSpotSyncedOut,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishPartyHubSpotConflict = async (
  payload: PartyHubSpotConflictPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialParty,
      aggregateId: payload.commercialPartyId ?? payload.organizationId ?? payload.hubspotCompanyId ?? 'unknown',
      eventType: EVENT_TYPES.commercialPartySyncConflict,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )
