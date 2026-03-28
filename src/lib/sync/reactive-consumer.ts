import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getProjectionsForEvent, getAllTriggerEventTypes, type ProjectionDomain } from './projection-registry'
import { ensureProjectionsRegistered } from './projections'
import { enqueueRefresh } from './refresh-queue'

// ── Types ──

export interface ReactiveConsumerResult {
  runId: string
  eventsProcessed: number
  eventsFailed: number
  projectionsTriggered: number
  actions: string[]
  durationMs: number
}

type ReactiveEventRow = {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  occurred_at: string | Date
}

// ── Schema provisioning ──

let ensureReactiveSchemaPromise: Promise<void> | null = null

export const ensureReactiveSchema = async () => {
  if (ensureReactiveSchemaPromise) return ensureReactiveSchemaPromise

  ensureReactiveSchemaPromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ exists: boolean }>(
      `SELECT to_regclass('greenhouse_sync.outbox_reactive_log') IS NOT NULL AS exists`
    )

    if (!rows[0]?.exists) {
      throw new Error(
        'greenhouse_sync.outbox_reactive_log is missing. Run scripts/setup-postgres-operations-infra.sql with an admin profile before enabling reactive projections.'
      )
    }
  })().catch(error => {
    ensureReactiveSchemaPromise = null
    throw error
  })

  return ensureReactiveSchemaPromise
}

// ── Main consumer ──

export const processReactiveEvents = async (options?: {
  batchSize?: number
  domain?: ProjectionDomain
}): Promise<ReactiveConsumerResult> => {
  const startMs = Date.now()
  const runId = `react-${randomUUID()}`
  const batchSize = options?.batchSize ?? 50
  const domain = options?.domain
  const actions: string[] = []
  let eventsFailed = 0
  let projectionsTriggered = 0

  // Ensure projections are registered
  ensureProjectionsRegistered()

  const triggerEventTypes = getAllTriggerEventTypes(domain)

  if (triggerEventTypes.length === 0) {
    return { runId, eventsProcessed: 0, eventsFailed: 0, projectionsTriggered: 0, actions: [], durationMs: Date.now() - startMs }
  }

  // Read published events that haven't been reactively processed yet
  const events = await runGreenhousePostgresQuery<ReactiveEventRow>(
    `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at
     FROM greenhouse_sync.outbox_events
     WHERE status = 'published'
       AND event_type = ANY($1)
       AND occurred_at > NOW() - INTERVAL '6 hours'
       AND event_id NOT IN (
         SELECT event_id FROM greenhouse_sync.outbox_reactive_log
         WHERE last_error IS NULL
       )
     ORDER BY occurred_at ASC
     LIMIT $2`,
    [triggerEventTypes, batchSize]
  )

  if (events.length === 0) {
    return { runId, eventsProcessed: 0, eventsFailed: 0, projectionsTriggered: 0, actions: [], durationMs: Date.now() - startMs }
  }

  for (const event of events) {
    const payload = typeof event.payload_json === 'string'
      ? JSON.parse(event.payload_json)
      : (event.payload_json as Record<string, unknown>) || {}

    // Inject event type into payload for notification routing
    payload._eventType = event.event_type
    payload._eventId = event.event_id

    const projections = getProjectionsForEvent(event.event_type, domain)

    for (const projection of projections) {
      try {
        const scope = projection.extractScope(payload)

        if (!scope) continue

        // Enqueue persistent intent (survives outbox expiration)
        await enqueueRefresh({
          projectionName: projection.name,
          entityType: scope.entityType,
          entityId: scope.entityId,
          priority: projection.maxRetries ?? 2
        }).catch(() => {})

        const actionDescription = await projection.refresh(scope, payload)

        if (actionDescription) {
          actions.push(`[${projection.name}] ${actionDescription}`)
          projectionsTriggered++
        }

        // Mark as processed
        await runGreenhousePostgresQuery(
          `INSERT INTO greenhouse_sync.outbox_reactive_log (event_id, reacted_at, handler, result, retries)
           VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 0)
           ON CONFLICT (event_id) DO UPDATE SET
             reacted_at = CURRENT_TIMESTAMP,
             handler = EXCLUDED.handler,
             result = EXCLUDED.result,
             last_error = NULL`,
          [event.event_id, `${projection.name}:${event.event_type}`, actionDescription || 'no-op']
        )
      } catch (error) {
        eventsFailed++
        const errorMsg = error instanceof Error ? error.message : String(error)

        console.error(`[reactive-consumer] ${projection.name} failed for event ${event.event_id}:`, error)

        // Check retry count
        const retryRows = await runGreenhousePostgresQuery<{ retries: number } & Record<string, unknown>>(
          `SELECT COALESCE(retries, 0) AS retries FROM greenhouse_sync.outbox_reactive_log WHERE event_id = $1`,
          [event.event_id]
        ).catch(() => [] as Array<{ retries: number } & Record<string, unknown>>)

        const currentRetries = retryRows[0]?.retries ?? 0
        const maxRetries = projection.maxRetries ?? 2

        if (currentRetries >= maxRetries) {
          // Dead-letter: mark as failed permanently
          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_sync.outbox_reactive_log (event_id, reacted_at, handler, result, retries, last_error)
             VALUES ($1, CURRENT_TIMESTAMP, $2, 'dead-letter', $3, $4)
             ON CONFLICT (event_id) DO UPDATE SET
               result = 'dead-letter',
               retries = EXCLUDED.retries,
               last_error = EXCLUDED.last_error`,
            [event.event_id, `${projection.name}:${event.event_type}`, currentRetries + 1, errorMsg]
          ).catch(() => {})

          actions.push(`[${projection.name}] DEAD-LETTER event ${event.event_id}: ${errorMsg}`)
        } else {
          // Increment retry counter but don't block — will retry next run
          await runGreenhousePostgresQuery(
            `INSERT INTO greenhouse_sync.outbox_reactive_log (event_id, reacted_at, handler, result, retries, last_error)
             VALUES ($1, CURRENT_TIMESTAMP, $2, 'retry', $3, $4)
             ON CONFLICT (event_id) DO UPDATE SET
               retries = EXCLUDED.retries,
               last_error = EXCLUDED.last_error`,
            [event.event_id, `${projection.name}:${event.event_type}`, currentRetries + 1, errorMsg]
          ).catch(() => {})
        }
      }
    }
  }

  return {
    runId,
    eventsProcessed: events.length,
    eventsFailed,
    projectionsTriggered,
    actions,
    durationMs: Date.now() - startMs
  }
}
