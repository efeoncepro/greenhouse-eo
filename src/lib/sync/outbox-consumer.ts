import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export interface OutboxPublishResult {
  runId: string
  eventsRead: number
  eventsPublished: number
  eventsFailed: number
  durationMs: number
}

type OutboxEventRow = {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  status: string
  occurred_at: string | Date
}

// ── Helpers ──

const toIsoString = (v: string | Date): string => {
  if (v instanceof Date) return v.toISOString()

  return typeof v === 'string' ? v : new Date().toISOString()
}

const describeBigQueryInsertError = (label: string, error: unknown) => {
  if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
    const sample = error.errors.slice(0, 5)

    return new Error(`${label} failed: ${JSON.stringify(sample, null, 2)}`)
  }

  return error instanceof Error ? new Error(`${label} failed: ${error.message}`) : new Error(`${label} failed`)
}

// ── Sync run tracking ──

const writeSyncRun = async ({
  runId,
  status,
  eventsRead = 0,
  eventsPublished = 0,
  notes
}: {
  runId: string
  status: 'running' | 'succeeded' | 'failed'
  eventsRead?: number
  eventsPublished?: number
  notes?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, records_written_raw, triggered_by, notes, finished_at
    )
    VALUES ($1, 'postgres_outbox', 'outbox_events', 'poll', $2, $3, $4, 'outbox_consumer', $5,
      CASE WHEN $2 = 'running' THEN NULL ELSE CURRENT_TIMESTAMP END)
    ON CONFLICT (sync_run_id) DO UPDATE SET
      status = EXCLUDED.status,
      records_read = EXCLUDED.records_read,
      records_written_raw = EXCLUDED.records_written_raw,
      notes = EXCLUDED.notes,
      finished_at = EXCLUDED.finished_at`,
    [runId, status, eventsRead, eventsPublished, notes || null]
  )
}

const writeSyncFailure = async ({
  runId,
  errorMessage,
  payload
}: {
  runId: string
  errorMessage: string
  payload?: Record<string, unknown>
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_failures (
      sync_failure_id, sync_run_id, source_system, source_object_type,
      error_message, payload_json, retryable
    )
    VALUES ($1, $2, 'postgres_outbox', 'outbox_events', $3, $4::jsonb, TRUE)`,
    [
      `fail-${randomUUID()}`,
      runId,
      errorMessage.slice(0, 2000),
      JSON.stringify(payload || {})
    ]
  )
}

// ── Main consumer ──

export const publishPendingOutboxEvents = async (options?: {
  batchSize?: number
}): Promise<OutboxPublishResult> => {
  const startMs = Date.now()
  const runId = `outbox-${randomUUID()}`
  const batchSize = options?.batchSize ?? 100

  // 1. Register run
  await writeSyncRun({ runId, status: 'running' })

  try {
    // 2. Read pending events
    const events = await runGreenhousePostgresQuery<OutboxEventRow>(
      `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
       FROM greenhouse_sync.outbox_events
       WHERE status = 'pending'
       ORDER BY occurred_at ASC
       LIMIT $1`,
      [batchSize]
    )

    if (events.length === 0) {
      await writeSyncRun({ runId, status: 'succeeded', eventsRead: 0, eventsPublished: 0, notes: 'No pending events' })

      return { runId, eventsRead: 0, eventsPublished: 0, eventsFailed: 0, durationMs: Date.now() - startMs }
    }

    // 3. Map to BigQuery format
    const publishedAt = new Date().toISOString()
    const bigQueryRows = events.map(event => ({
      event_id: event.event_id,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      event_type: event.event_type,
      payload_json: typeof event.payload_json === 'string'
        ? event.payload_json
        : JSON.stringify(event.payload_json),
      occurred_at: toIsoString(event.occurred_at),
      published_at: publishedAt,
      publish_run_id: runId
    }))

    // 4. Insert to BigQuery
    const bigQuery = getBigQueryClient()

    try {
      await bigQuery.dataset('greenhouse_raw').table('postgres_outbox_events').insert(bigQueryRows)
    } catch (error) {
      // Handle partial insert failures — BigQuery may reject individual rows
      const bqError = error as { errors?: Array<{ row?: Record<string, unknown>; errors?: unknown[] }> }

      if (bqError.errors && Array.isArray(bqError.errors)) {
        // Extract IDs of failed rows
        const failedEventIds = new Set<string>()

        for (const rowError of bqError.errors) {
          const eventId = rowError.row?.event_id as string | undefined

          if (eventId) failedEventIds.add(eventId)
        }

        // If ALL rows failed, treat as total failure
        if (failedEventIds.size >= events.length) {
          throw describeBigQueryInsertError('greenhouse_raw.postgres_outbox_events', error)
        }

        // Partial failure: mark successful ones as published
        const successfulIds = events
          .map(e => e.event_id)
          .filter(id => !failedEventIds.has(id))

        if (successfulIds.length > 0) {
          await runGreenhousePostgresQuery(
            `UPDATE greenhouse_sync.outbox_events
             SET status = 'published', published_at = NOW()
             WHERE event_id = ANY($1)`,
            [successfulIds]
          )
        }

        await writeSyncFailure({
          runId,
          errorMessage: `Partial BigQuery insert: ${failedEventIds.size} of ${events.length} rows failed`,
          payload: { failedEventIds: Array.from(failedEventIds).slice(0, 20) }
        })

        await writeSyncRun({
          runId,
          status: 'succeeded',
          eventsRead: events.length,
          eventsPublished: successfulIds.length,
          notes: `Partial: ${successfulIds.length} published, ${failedEventIds.size} failed`
        })

        return {
          runId,
          eventsRead: events.length,
          eventsPublished: successfulIds.length,
          eventsFailed: failedEventIds.size,
          durationMs: Date.now() - startMs
        }
      }

      // Non-partial error — rethrow
      throw describeBigQueryInsertError('greenhouse_raw.postgres_outbox_events', error)
    }

    // 5. Mark all events as published
    const publishedIds = events.map(e => e.event_id)

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.outbox_events
       SET status = 'published', published_at = NOW()
       WHERE event_id = ANY($1)`,
      [publishedIds]
    )

    // 6. Finalize run
    await writeSyncRun({
      runId,
      status: 'succeeded',
      eventsRead: events.length,
      eventsPublished: events.length
    })

    return {
      runId,
      eventsRead: events.length,
      eventsPublished: events.length,
      eventsFailed: 0,
      durationMs: Date.now() - startMs
    }
  } catch (error) {
    // Total failure — events remain pending for next cycle
    const errorMessage = error instanceof Error ? error.message : String(error)

    await writeSyncFailure({ runId, errorMessage }).catch(() => {})
    await writeSyncRun({ runId, status: 'failed', notes: errorMessage.slice(0, 500) }).catch(() => {})

    throw error
  }
}
