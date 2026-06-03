import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { EVENT_TYPES, AGGREGATE_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export const newCaseId = () => `clc-${randomUUID()}`
export const newItemId = () => `clci-${randomUUID()}`
export const newEventId = () => `clce-${randomUUID()}`

interface InsertCaseEventInput {
  caseId: string
  eventKind: string
  fromStatus?: string | null
  toStatus?: string | null
  actorUserId?: string | null
  payload?: Record<string, unknown>
}

/** Append an immutable row to the case audit log within the active transaction. */
export const insertCaseEvent = async (client: PoolClient, input: InsertCaseEventInput) => {
  await client.query(
    `INSERT INTO greenhouse_core.client_lifecycle_case_events (
       event_id, case_id, event_kind, from_status, to_status, payload_json, actor_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      newEventId(),
      input.caseId,
      input.eventKind,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      JSON.stringify(input.payload ?? {}),
      input.actorUserId ?? null
    ]
  )
}

/** Publish a versioned v1 lifecycle outbox event inside the active transaction. */
export const publishLifecycleEvent = async (
  client: PoolClient,
  eventType: string,
  caseId: string,
  payload: Record<string, unknown>
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.clientLifecycleCase,
      aggregateId: caseId,
      eventType,
      payload: { schemaVersion: 1, caseId, ...payload }
    },
    client
  )
}

export const LIFECYCLE_EVENT_TYPES = EVENT_TYPES
