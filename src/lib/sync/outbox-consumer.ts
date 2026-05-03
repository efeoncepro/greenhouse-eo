import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

// ── Types ──

export interface OutboxPublishResult {
  runId: string
  eventsRead: number
  eventsPublished: number
  eventsFailed: number
  eventsDeadLetter: number
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
  published_attempts: number
}

// TASK-773 — max retries antes de routear a dead_letter. Cloud Scheduler corre
// cada 2 min → 10 min de retry total cubre transient BQ failures sin saturar.
export const OUTBOX_MAX_PUBLISH_ATTEMPTS = 5

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

/**
 * TASK-773 — Worker outbox publisher con state machine canónica.
 *
 * Flujo:
 *   1. Inicio run + audit en source_sync_runs
 *   2. Tx 1 — claim batch: SELECT FOR UPDATE SKIP LOCKED + UPDATE
 *      status='publishing' (lock concurrency-safe sin contención
 *      cuando hay múltiples instancias del worker corriendo en paralelo).
 *   3. BigQuery insert batch a greenhouse_raw.postgres_outbox_events.
 *      Soporta partial failure: rows OK marcan published, rows FAIL
 *      incrementan published_attempts y vuelven a 'failed' o
 *      'dead_letter' según OUTBOX_MAX_PUBLISH_ATTEMPTS.
 *   4. Tx 2 — finaliza state: UPDATE per-event con status final.
 *   5. Cierre run + audit final.
 *
 * Idempotencia:
 *   - SKIP LOCKED garantiza que dos workers no procesan el mismo event
 *   - event_id es PK natural en BQ raw (insert con dedup natural)
 *   - status='publishing' hace que el próximo SELECT no lo revisite
 *
 * Recovery:
 *   - status='failed' es retry-eligible (vuelve al SELECT del próximo run)
 *   - status='dead_letter' requiere intervención humana (signal alerta)
 *   - publishing_started_at expirado (>10 min) puede recuperarse via
 *     /reactive/recover en una task derivada futura
 */
export const publishPendingOutboxEvents = async (options?: {
  batchSize?: number
  maxRetries?: number
}): Promise<OutboxPublishResult> => {
  const startMs = Date.now()
  const runId = `outbox-${randomUUID()}`
  const batchSize = options?.batchSize ?? 100
  const maxRetries = options?.maxRetries ?? OUTBOX_MAX_PUBLISH_ATTEMPTS

  await writeSyncRun({ runId, status: 'running' })

  try {
    // Step 1 — Claim batch atomically (concurrency-safe via SKIP LOCKED).
    // Selecciona pending OR failed (retry-eligible). Marca como 'publishing'
    // dentro de la misma tx para garantizar exclusivo lock semántico.
    const events = await withGreenhousePostgresTransaction(async client => {
      const claimed = await client.query<OutboxEventRow>(
        `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, status,
                occurred_at, published_attempts
         FROM greenhouse_sync.outbox_events
         WHERE status IN ('pending', 'failed')
         ORDER BY occurred_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1`,
        [batchSize]
      )

      if (claimed.rows.length === 0) return []

      const ids = claimed.rows.map(r => r.event_id)

      await client.query(
        `UPDATE greenhouse_sync.outbox_events
         SET status = 'publishing',
             publishing_started_at = NOW()
         WHERE event_id = ANY($1)`,
        [ids]
      )

      return claimed.rows
    })

    if (events.length === 0) {
      await writeSyncRun({ runId, status: 'succeeded', eventsRead: 0, eventsPublished: 0, notes: 'No pending events' })

      return {
        runId,
        eventsRead: 0,
        eventsPublished: 0,
        eventsFailed: 0,
        eventsDeadLetter: 0,
        durationMs: Date.now() - startMs
      }
    }

    // Step 2 — Map to BigQuery format
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

    // Step 3 — Insert to BigQuery (handle partial failure)
    const bigQuery = getBigQueryClient()
    const failedEventIds = new Set<string>()
    let bqGlobalError: Error | null = null

    try {
      await bigQuery.dataset('greenhouse_raw').table('postgres_outbox_events').insert(bigQueryRows)
    } catch (error) {
      const bqError = error as { errors?: Array<{ row?: Record<string, unknown>; errors?: unknown[] }> }

      if (bqError.errors && Array.isArray(bqError.errors)) {
        for (const rowError of bqError.errors) {
          const eventId = rowError.row?.event_id as string | undefined

          if (eventId) failedEventIds.add(eventId)
        }

        // ALL rows failed → treat as global error
        if (failedEventIds.size >= events.length) {
          bqGlobalError = describeBigQueryInsertError('greenhouse_raw.postgres_outbox_events', error)
          for (const e of events) failedEventIds.add(e.event_id)
        }
      } else {
        // Non-partial error → ALL fail
        bqGlobalError = describeBigQueryInsertError('greenhouse_raw.postgres_outbox_events', error)
        for (const e of events) failedEventIds.add(e.event_id)
      }
    }

    const successfulEvents = events.filter(e => !failedEventIds.has(e.event_id))
    const failedEvents = events.filter(e => failedEventIds.has(e.event_id))

    // Step 4 — Finalize state per event (Tx 2)
    await withGreenhousePostgresTransaction(async client => {
      // 4a — Successful: status='published', published_at, reset attempts
      if (successfulEvents.length > 0) {
        await client.query(
          `UPDATE greenhouse_sync.outbox_events
           SET status = 'published',
               published_at = NOW(),
               publishing_started_at = NULL,
               last_publish_error = NULL
           WHERE event_id = ANY($1)`,
          [successfulEvents.map(e => e.event_id)]
        )
      }

      // 4b — Failed: increment attempts, route to 'failed' or 'dead_letter'
      // según OUTBOX_MAX_PUBLISH_ATTEMPTS.
      if (failedEvents.length > 0) {
        const errorSummary = bqGlobalError
          ? redactErrorForResponse(bqGlobalError)
          : 'Partial BigQuery insert: row rejected (see source_sync_failures)'

        // Routing per-event: dead_letter si attempts+1 >= maxRetries
        const deadLetterIds: string[] = []
        const failedRetryIds: string[] = []

        for (const ev of failedEvents) {
          const nextAttempts = (ev.published_attempts ?? 0) + 1

          if (nextAttempts >= maxRetries) {
            deadLetterIds.push(ev.event_id)
          } else {
            failedRetryIds.push(ev.event_id)
          }
        }

        if (failedRetryIds.length > 0) {
          await client.query(
            `UPDATE greenhouse_sync.outbox_events
             SET status = 'failed',
                 publishing_started_at = NULL,
                 published_attempts = published_attempts + 1,
                 last_publish_error = $2
             WHERE event_id = ANY($1)`,
            [failedRetryIds, errorSummary.slice(0, 500)]
          )
        }

        if (deadLetterIds.length > 0) {
          await client.query(
            `UPDATE greenhouse_sync.outbox_events
             SET status = 'dead_letter',
                 publishing_started_at = NULL,
                 published_attempts = published_attempts + 1,
                 last_publish_error = $2,
                 dead_letter_at = NOW()
             WHERE event_id = ANY($1)`,
            [deadLetterIds, errorSummary.slice(0, 500)]
          )

          // Sentry signal — humano debe intervenir
          captureWithDomain(bqGlobalError ?? new Error(errorSummary), 'sync', {
            tags: { source: 'outbox_publisher_dead_letter' },
            extra: { runId, deadLetterCount: deadLetterIds.length, sampleIds: deadLetterIds.slice(0, 10) }
          })
        }
      }
    })

    // Step 5 — Audit failure if any
    const eventsDeadLetter = failedEvents.filter(e => (e.published_attempts + 1) >= maxRetries).length

    if (failedEventIds.size > 0) {
      await writeSyncFailure({
        runId,
        errorMessage: bqGlobalError
          ? bqGlobalError.message.slice(0, 2000)
          : `Partial BigQuery insert: ${failedEventIds.size} of ${events.length} rows failed`,
        payload: {
          failedEventIds: Array.from(failedEventIds).slice(0, 20),
          deadLetterCount: eventsDeadLetter
        }
      }).catch(() => {})
    }

    const eventsPublished = successfulEvents.length
    const eventsFailed = failedEventIds.size

    await writeSyncRun({
      runId,
      status: 'succeeded',
      eventsRead: events.length,
      eventsPublished,
      notes: failedEventIds.size > 0
        ? `Partial: ${eventsPublished} published, ${eventsFailed} failed (${eventsDeadLetter} dead-letter)`
        : null
    })

    return {
      runId,
      eventsRead: events.length,
      eventsPublished,
      eventsFailed,
      eventsDeadLetter,
      durationMs: Date.now() - startMs
    }
  } catch (error) {
    // Total failure — events claim was rolled back o BQ catastrophic
    const errorMessage = error instanceof Error ? error.message : String(error)

    captureWithDomain(error, 'sync', {
      tags: { source: 'outbox_publisher_unexpected' },
      extra: { runId }
    })

    await writeSyncFailure({ runId, errorMessage }).catch(() => {})
    await writeSyncRun({ runId, status: 'failed', notes: errorMessage.slice(0, 500) }).catch(() => {})

    throw error
  }
}
