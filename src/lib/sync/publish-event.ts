import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AggregateType, EventType } from './event-catalog'

// ── Types ──

interface OutboxEvent {
  aggregateType: AggregateType | string
  aggregateId: string
  eventType: EventType | string
  payload: Record<string, unknown>
}

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

// ── Publisher ──

/**
 * Publish an event to the outbox table.
 *
 * Supports two modes:
 * - **With client** (inside a transaction): pass a PoolClient for transactional consistency
 * - **Without client** (standalone): uses the shared postgres pool
 *
 * @returns The generated event_id
 */
export async function publishOutboxEvent(
  event: OutboxEvent,
  client?: QueryableClient
): Promise<string> {
  const eventId = `outbox-${randomUUID()}`

  const sql = `
    INSERT INTO greenhouse_sync.outbox_events (
      event_id, aggregate_type, aggregate_id,
      event_type, payload_json, status, occurred_at
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', CURRENT_TIMESTAMP)
  `

  const values = [
    eventId,
    event.aggregateType,
    event.aggregateId,
    event.eventType,
    JSON.stringify(event.payload)
  ]

  if (client) {
    await client.query(sql, values)
  } else {
    await runGreenhousePostgresQuery(sql, values)
  }

  return eventId
}
