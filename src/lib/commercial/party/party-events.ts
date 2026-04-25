import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type {
  LifecycleStage,
  LifecycleTransitionSource,
  LifecycleTriggerEntity
} from './types'

// TASK-535: publishers for the Fase A party lifecycle events. The rest of the
// catalog (sync conflict, merged, hubspot in/out) belongs to Fases B/F and is
// introduced by those tasks.

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

export interface PartyCreatedPayload {
  commercialPartyId: string
  organizationId: string
  initialStage: LifecycleStage
  source: LifecycleTransitionSource
  hubspotCompanyId?: string | null
}

export interface PartyPromotedPayload {
  commercialPartyId: string
  organizationId: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  source: LifecycleTransitionSource
  triggerEntity?: LifecycleTriggerEntity
  actorUserId?: string | null
  reason?: string | null
}

export interface PartyDemotedPayload extends PartyPromotedPayload {
  direction: 'demote'
}

export interface ClientInstantiatedPayload {
  clientId: string
  clientProfileId: string
  organizationId: string
  commercialPartyId: string
  triggerEntity: LifecycleTriggerEntity
  actorUserId?: string | null
}

export const publishPartyCreated = async (
  payload: PartyCreatedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialParty,
      aggregateId: payload.commercialPartyId,
      eventType: EVENT_TYPES.commercialPartyCreated,
      payload: { ...payload }
    },
    client
  )

export const publishPartyPromoted = async (
  payload: PartyPromotedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialParty,
      aggregateId: payload.commercialPartyId,
      eventType: EVENT_TYPES.commercialPartyPromoted,
      payload: { ...payload }
    },
    client
  )

export const publishPartyDemoted = async (
  payload: PartyDemotedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialParty,
      aggregateId: payload.commercialPartyId,
      eventType: EVENT_TYPES.commercialPartyDemoted,
      payload: { ...payload }
    },
    client
  )

export const publishClientInstantiated = async (
  payload: ClientInstantiatedPayload,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialClient,
      aggregateId: payload.clientId,
      eventType: EVENT_TYPES.commercialClientInstantiated,
      payload: { ...payload }
    },
    client
  )
