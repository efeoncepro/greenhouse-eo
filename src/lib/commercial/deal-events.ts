import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

interface BaseDealEventPayload {
  dealId: string
  hubspotDealId: string
  hubspotPipelineId: string | null
  dealstage: string
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
}

export const publishDealCreated = async (
  payload: BaseDealEventPayload & {
    amountClp: number | null
    currency: string
    closeDate: string | null
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.deal,
      aggregateId: payload.dealId,
      eventType: EVENT_TYPES.dealCreated,
      payload: { ...payload }
    },
    client
  )

export const publishDealSynced = async (
  payload: BaseDealEventPayload & {
    action: 'created' | 'updated'
    amountClp: number | null
    currency: string
    closeDate: string | null
    isClosed: boolean
    isWon: boolean
    changedFields: string[]
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.deal,
      aggregateId: payload.dealId,
      eventType: EVENT_TYPES.dealSynced,
      payload: { ...payload }
    },
    client
  )

export const publishDealStageChanged = async (
  payload: BaseDealEventPayload & {
    previousPipelineId: string | null
    previousDealstage: string | null
    previousStageLabel: string | null
    currentStageLabel: string | null
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.deal,
      aggregateId: payload.dealId,
      eventType: EVENT_TYPES.dealStageChanged,
      payload: { ...payload }
    },
    client
  )

export const publishDealWon = async (
  payload: BaseDealEventPayload & {
    amountClp: number | null
    closeDate: string | null
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.deal,
      aggregateId: payload.dealId,
      eventType: EVENT_TYPES.dealWon,
      payload: { ...payload }
    },
    client
  )

export const publishDealLost = async (
  payload: BaseDealEventPayload & {
    closeDate: string | null
  },
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.deal,
      aggregateId: payload.dealId,
      eventType: EVENT_TYPES.dealLost,
      payload: { ...payload }
    },
    client
  )
