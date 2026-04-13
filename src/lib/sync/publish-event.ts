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

// ── Period-level materialization publisher ──

interface PeriodMaterializedEventInput {

  /** Aggregate type for the outbox event (e.g. `provider_tooling_snapshot`). */
  aggregateType: AggregateType | string

  /** Event type for the outbox event (e.g. `provider.tooling_snapshot.period_materialized`). */
  eventType: EventType | string

  /** Canonical period identifier (`YYYY-MM`). Also becomes the aggregate_id by default. */
  periodId: string

  /** Number of entities materialized in this period refresh. Surfaced in the payload for consumers. */
  snapshotCount: number

  /** Optional aggregate_id override. Defaults to `periodId`. */
  aggregateId?: string

  /** Additional payload fields merged on top of the period-level envelope. */
  payload?: Record<string, unknown>
}

/**
 * Publish a single coarse-grained "period materialized" event after a projection refresh.
 *
 * **Schema versioning convention (introduced by TASK-379).**
 *
 * Payloads produced by this helper always carry `schemaVersion: 2`. The v2 convention is
 * period-scoped: one event per refresh run describes the whole period rather than one event
 * per entity/snapshot. This replaces the legacy fan-out pattern where projections emitted
 * N events (one per provider, allocation, or P&L snapshot) and the reactive consumer then
 * had to coalesce them on read.
 *
 * Consumers must accept **both** schema versions during the migration window:
 * - **v1 (legacy)** — payload has no `schemaVersion` field and represents a single entity.
 *   Still flowing through the outbox until the v1 publish paths are retired (~2 weeks after
 *   v2 rollout, in a dedicated cleanup task).
 * - **v2 (current)** — payload has `schemaVersion: 2`, `periodId`, `snapshotCount`,
 *   `_materializedAt`, plus caller-specific context. Consumers should refetch the latest
 *   materialized state from the source-of-truth tables rather than reading entity detail
 *   from the payload itself.
 *
 * Supports a transactional `client?` just like {@link publishOutboxEvent}.
 *
 * @returns The generated event_id
 */
export async function publishPeriodMaterializedEvent(
  input: PeriodMaterializedEventInput,
  client?: QueryableClient
): Promise<string> {
  const payload: Record<string, unknown> = {
    ...(input.payload ?? {}),
    schemaVersion: 2,
    periodId: input.periodId,
    snapshotCount: input.snapshotCount,
    _materializedAt: new Date().toISOString()
  }

  return publishOutboxEvent(
    {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId ?? input.periodId,
      eventType: input.eventType,
      payload
    },
    client
  )
}
