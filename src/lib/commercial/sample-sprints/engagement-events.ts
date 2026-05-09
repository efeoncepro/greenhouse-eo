import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { QueryableClient } from './audit-log'

export const ENGAGEMENT_EVENT_TYPES = [
  EVENT_TYPES.serviceEngagementDeclared,
  EVENT_TYPES.serviceEngagementApproved,
  EVENT_TYPES.serviceEngagementRejected,
  EVENT_TYPES.serviceEngagementCapacityOverridden,
  EVENT_TYPES.serviceEngagementPhaseCompleted,
  EVENT_TYPES.serviceEngagementProgressSnapshotRecorded,
  EVENT_TYPES.serviceEngagementOutcomeRecorded,
  EVENT_TYPES.serviceEngagementCancelled,
  EVENT_TYPES.serviceEngagementConverted,
  // TASK-837 Slice 3 + 5 — Sample Sprint outbound projection events.
  EVENT_TYPES.serviceEngagementOutboundRequested,
  EVENT_TYPES.serviceEngagementOutboundSkipped
] as const

export type EngagementEventType = typeof ENGAGEMENT_EVENT_TYPES[number]

export interface PublishEngagementEventInput {
  serviceId: string
  eventType: EngagementEventType
  actorUserId?: string | null
  payload?: Record<string, unknown> | null
}

export const publishEngagementEvent = async (
  input: PublishEngagementEventInput,
  client?: QueryableClient
): Promise<string> => {
  const serviceId = input.serviceId.trim()
  const actorUserId = input.actorUserId?.trim() || null

  if (!serviceId) throw new Error('serviceId is required.')

  return publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.service,
      aggregateId: serviceId,
      eventType: input.eventType,
      payload: {
        ...(input.payload ?? {}),
        version: 1,
        serviceId,
        actorUserId,
        emittedAt: new Date().toISOString()
      }
    },
    client
  )
}
