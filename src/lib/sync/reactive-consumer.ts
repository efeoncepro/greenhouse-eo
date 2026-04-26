import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { emitConsumerRunMetrics } from '@/lib/operations/cloud-monitoring-emitter'
import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  evaluateCircuit,
  recordFailure as recordCircuitFailure,
  recordSuccess as recordCircuitSuccess,
  type CircuitBreakerConfig
} from '@/lib/operations/reactive-circuit-breaker'

import {
  getAllTriggerEventTypes,
  getProjectionsForEvent,
  type ProjectionDefinition,
  type ProjectionDomain
} from './projection-registry'
import { buildReactiveHandlerKey as sharedBuildReactiveHandlerKey } from './reactive-handler-key'
import { ensureProjectionsRegistered } from './projections'
import {
  buildRefreshQueueId,
  enqueueRefresh,
  markRefreshCompleted,
  markRefreshFailed
} from './refresh-queue'
import { classifyReactiveError } from './reactive-error-classification'
import { recordHandlerOutcomes, type HandlerOutcome } from './handler-health'

/**
 * V2 reactive consumer (TASK-379).
 *
 * Differences from V1:
 *   1. Scope-level coalescing — N events that map to the same
 *      (projection, scope) collapse to 1 refresh call. The V1 ran
 *      projection.refresh() once per event, which produced the fan-out
 *      backlog observed in ISSUE-046 (5040 unprocessed events).
 *   2. No silent-skip path — every fetched event gets an entry in
 *      outbox_reactive_log: 'coalesced' on success, 'no-op:no-handler'
 *      when no projection consumes its type, 'no-op:no-scope' when the
 *      projection's extractScope returns null, 'retry' / 'dead-letter'
 *      on failure. The V1's `if (!scope) continue` left these events
 *      forever unmarked, which is what made the worker re-fetch the
 *      same 50 events every run without making progress.
 *   3. Per-projection circuit breaker — a chronically failing
 *      projection is quarantined for a cooldown window so it cannot
 *      block the rest of the queue.
 *   4. Bulk acknowledgement — when a scope group succeeds, all
 *      contributing events are inserted into outbox_reactive_log in one
 *      batch INSERT (not N round-trips).
 *
 * Multi-instance safety: this V2 still iterates the outbox without
 * row-level locking, but every database operation is idempotent:
 *   - INSERT into outbox_reactive_log uses ON CONFLICT (event_id, handler)
 *     DO UPDATE so duplicate inserts collapse safely.
 *   - projection.refresh() must be idempotent per the V1 playbook
 *     contract (re-running with the same scope and payload produces the
 *     same result). All registered projections honor this.
 *   - enqueueRefresh() dedupes by (projection_name, entity_type,
 *     entity_id) via the existing UNIQUE constraint on refresh_queue.
 * Two concurrent workers may redundantly process the same scope, but
 * they cannot corrupt state. Strict single-processing comes in V3 via
 * SKIP LOCKED claim columns on outbox_events.
 */

// ── Types ──

export interface ReactiveConsumerResult {
  runId: string

  /** Total outbox events fetched into this run. */
  eventsFetched: number

  /** Events acknowledged into outbox_reactive_log (success or no-op or skipped). */
  eventsAcknowledged: number

  /** Unique (projection, scope) groups processed via projection.refresh(). */
  scopesCoalesced: number

  /** Refreshes that returned a non-null actionDescription. */
  projectionsTriggered: number

  /** Scope groups whose refresh threw an exception. */
  scopeGroupsFailed: number

  /** Scope groups skipped because the circuit breaker was open. */
  scopeGroupsBreakerSkipped: number

  /** Free-form action log for observability (kept short). */
  actions: string[]

  /** Per-projection summary for observability and metric emission. */
  perProjection: Record<string, ReactiveProjectionStats>
  durationMs: number

  // ── Backwards-compatible fields kept for ops-worker / Ops Health ──
  /** @deprecated Prefer eventsAcknowledged. Kept so existing dashboards keep parsing. */
  eventsProcessed: number

  /** @deprecated Prefer scopeGroupsFailed + per-event detail. */
  eventsFailed: number
}

export interface ReactiveProjectionStats {
  projectionName: string
  scopesCoalesced: number
  eventsAcknowledged: number
  successes: number
  failures: number
  breakerSkips: number
  totalLatencyMs: number
}

type ReactiveEventRow = {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  occurred_at: string | Date
}

interface ScopeGroup {
  projection: ProjectionDefinition
  scope: { entityType: string; entityId: string }
  events: ReactiveEventRow[]

  /** The most recent event payload — passed to refresh() so the projection can read _eventType etc. */
  representativePayload: Record<string, unknown>
}

const NO_HANDLER_SENTINEL = 'system:no-handler'

const SYSTEM_NO_OP_RESULT = 'no-op:no-handler'
const NO_SCOPE_RESULT = 'no-op:no-scope'
const COALESCED_RESULT_PREFIX = 'coalesced'

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

// ── Helpers ──

// Re-export the pure helper so every existing caller of
// `reactive-consumer.buildReactiveHandlerKey` keeps working. The
// canonical definition lives in `./reactive-handler-key` (no
// server-only) so scripts, tests, and readers can import it without
// pulling the whole consumer runtime.
export const buildReactiveHandlerKey = sharedBuildReactiveHandlerKey

const parsePayload = (event: ReactiveEventRow): Record<string, unknown> => {
  const raw = event.payload_json

  const parsed =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : ((raw as Record<string, unknown>) ?? {})

  parsed._eventType = event.event_type
  parsed._eventId = event.event_id

  return parsed
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Bulk insert reactive log entries via a single multi-row INSERT.
 * Idempotent: ON CONFLICT (event_id, handler) DO UPDATE preserves whatever
 * the most recent processing attempt produced.
 *
 * `entries` may be empty — caller is responsible for the guard.
 */
const bulkAcknowledgeEvents = async (
  entries: Array<{
    eventId: string
    handler: string
    result: string
    lastError: string | null
    retries: number
    errorClass?: string | null
    errorFamily?: string | null
    isInfrastructureFault?: boolean
  }>
): Promise<void> => {
  if (entries.length === 0) return

  // Build a multi-row VALUES clause. Postgres has a 65535-parameter limit,
  // and each row uses 8 parameters, so we cap chunks at ~10000 rows for
  // safety. In practice the consumer batches at <1000 events.
  const CHUNK_SIZE = 10_000

  for (let chunkStart = 0; chunkStart < entries.length; chunkStart += CHUNK_SIZE) {
    const chunk = entries.slice(chunkStart, chunkStart + CHUNK_SIZE)
    const values: string[] = []
    const params: unknown[] = []

    chunk.forEach((entry, index) => {
      const base = index * 8

      values.push(
        `($${base + 1}, CURRENT_TIMESTAMP, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
      )
      params.push(
        entry.eventId,
        entry.handler,
        entry.result,
        entry.retries,
        entry.lastError,
        entry.errorClass ?? null,
        entry.errorFamily ?? null,
        entry.isInfrastructureFault ?? false
      )
    })

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.outbox_reactive_log (
         event_id,
         reacted_at,
         handler,
         result,
         retries,
         last_error,
         error_class,
         error_family,
         is_infrastructure_fault
       )
       VALUES ${values.join(', ')}
       ON CONFLICT (event_id, handler) DO UPDATE SET
         reacted_at = CURRENT_TIMESTAMP,
         result = EXCLUDED.result,
         retries = EXCLUDED.retries,
         last_error = EXCLUDED.last_error,
         error_class = EXCLUDED.error_class,
         error_family = EXCLUDED.error_family,
         is_infrastructure_fault = EXCLUDED.is_infrastructure_fault`,
      params
    )

    // Fold each entry into the canonical handler_health state machine.
    // Failure is non-fatal here: the reactive worker MUST not regress on a
    // health-table write error, so the audit log stays the primary source
    // and we just log + continue.
    try {
      await recordHandlerOutcomes(
        chunk.map(entry => ({
          handler: entry.handler,
          outcome: classifyOutcome(entry.result),
          eventId: entry.eventId,
          errorClass: entry.errorClass ?? null,
          errorFamily: entry.errorFamily ?? null
        }))
      )
    } catch (error) {
      console.warn('[reactive-consumer] handler_health upsert failed', {
        error: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }
}

/**
 * Map the audit-log `result` string to the canonical `HandlerOutcome` enum
 * consumed by `handler_health`. Unknown values default to `no-op` (treated
 * as success) — better to be optimistic about state than to falsely flag
 * a handler as failed because of a string we don't recognize.
 */
const classifyOutcome = (result: string): HandlerOutcome => {
  if (result === 'success' || result.startsWith('success')) return 'success'
  if (result === 'dead-letter') return 'dead-letter'
  if (result === 'retry') return 'retry'
  if (result.startsWith('skipped')) return 'skipped'
  if (result.startsWith('no-op') || result.startsWith('coalesced')) return 'no-op'

  return 'no-op'
}

const ensureProjectionStats = (
  perProjection: Record<string, ReactiveProjectionStats>,
  projectionName: string
): ReactiveProjectionStats => {
  const existing = perProjection[projectionName]

  if (existing) return existing

  const fresh: ReactiveProjectionStats = {
    projectionName,
    scopesCoalesced: 0,
    eventsAcknowledged: 0,
    successes: 0,
    failures: 0,
    breakerSkips: 0,
    totalLatencyMs: 0
  }

  perProjection[projectionName] = fresh

  return fresh
}

// ── Audit-only event sweep ──

export interface AuditOnlySweepResult {
  runId: string
  eventsSwept: number
  perEventType: Record<string, number>
  durationMs: number
}

/**
 * Sweep audit-only events out of the outbox.
 *
 * "Audit-only" = events whose `event_type` has zero registered projection
 * handlers across all domains. They are published intentionally for audit
 * trail or downstream sync (Nubox, quotes, products, payroll projections,
 * etc.) but no reactive consumer ever processes them. Without a sweep they
 * accumulate in `outbox_events` indefinitely, which inflates table size
 * and skews any raw COUNT query against the outbox.
 *
 * The sweep marks them as `no-op:audit-only` in `outbox_reactive_log` under
 * the system-level handler `system:no-handler`. After the mark:
 *   - The Ops Health backlog metric continues to ignore them (because it
 *     filters by `getAllTriggerEventTypes()`, which they're not in).
 *   - A future retention cron can safely DELETE outbox events whose
 *     reactive_log entry is `no-op:audit-only` and older than N days.
 *   - The raw outbox_events COUNT no longer grows unbounded.
 *
 * Idempotent and safe to call from any cron lane. Defaults to 1000 events
 * per call which keeps a single sweep under ~50ms typical Postgres latency.
 */
export const sweepAuditOnlyEvents = async (options?: {
  batchSize?: number
}): Promise<AuditOnlySweepResult> => {
  const startMs = Date.now()
  const runId = `sweep-audit-${randomUUID()}`
  const batchSize = options?.batchSize ?? 1000

  ensureProjectionsRegistered()

  const handledEventTypes = getAllTriggerEventTypes()

  // Fetch unprocessed events whose type is NOT in the handled set.
  const events = await runGreenhousePostgresQuery<{ event_id: string; event_type: string }>(
    `SELECT e.event_id, e.event_type
       FROM greenhouse_sync.outbox_events e
      WHERE e.status = 'published'
        AND e.event_type <> ALL($1)
        AND NOT EXISTS (
          SELECT 1
            FROM greenhouse_sync.outbox_reactive_log r
           WHERE r.event_id = e.event_id
        )
      ORDER BY e.occurred_at ASC
      LIMIT $2`,
    [handledEventTypes, batchSize]
  )

  if (events.length === 0) {
    return { runId, eventsSwept: 0, perEventType: {}, durationMs: Date.now() - startMs }
  }

  const perEventType: Record<string, number> = {}

  for (const event of events) {
    perEventType[event.event_type] = (perEventType[event.event_type] ?? 0) + 1
  }

  await bulkAcknowledgeEvents(
    events.map(event => ({
      eventId: event.event_id,
      handler: NO_HANDLER_SENTINEL,
      result: 'no-op:audit-only',
      lastError: null,
      retries: 0
    }))
  )

  return {
    runId,
    eventsSwept: events.length,
    perEventType,
    durationMs: Date.now() - startMs
  }
}

// ── Main consumer ──

export const processReactiveEvents = async (options?: {
  batchSize?: number
  domain?: ProjectionDomain
  circuitBreakerConfig?: CircuitBreakerConfig
}): Promise<ReactiveConsumerResult> => {
  const startMs = Date.now()
  const runId = `react-${randomUUID()}`

  // V2 default batchSize is intentionally larger than V1 (50). Larger batches
  // give scope coalescing more material to deduplicate against.
  const batchSize = options?.batchSize ?? 500
  const domain = options?.domain
  const breakerConfig = options?.circuitBreakerConfig ?? DEFAULT_CIRCUIT_BREAKER_CONFIG
  const actions: string[] = []
  const perProjection: Record<string, ReactiveProjectionStats> = {}
  let scopeGroupsFailed = 0
  let scopeGroupsBreakerSkipped = 0
  let projectionsTriggered = 0

  ensureProjectionsRegistered()

  const triggerEventTypes = getAllTriggerEventTypes(domain)

  if (triggerEventTypes.length === 0) {
    return {
      runId,
      eventsFetched: 0,
      eventsAcknowledged: 0,
      scopesCoalesced: 0,
      projectionsTriggered: 0,
      scopeGroupsFailed: 0,
      scopeGroupsBreakerSkipped: 0,
      actions,
      perProjection,
      durationMs: Date.now() - startMs,
      eventsProcessed: 0,
      eventsFailed: 0
    }
  }

  // ── Phase A: fetch a batch of unprocessed events ──
  //
  // We fetch events that have at least one trigger handler with NO log entry
  // for the matching (projection, event_type) handler key. This ensures the
  // V2 consumer makes progress even when previous runs left silent-skip
  // events behind: the post-processing acknowledgement guarantees they will
  // not be re-fetched.

  const events = await runGreenhousePostgresQuery<ReactiveEventRow>(
    `SELECT e.event_id, e.aggregate_type, e.aggregate_id, e.event_type, e.payload_json, e.occurred_at
       FROM greenhouse_sync.outbox_events e
      WHERE e.status = 'published'
        AND e.event_type = ANY($1)
        AND NOT EXISTS (
          SELECT 1
            FROM greenhouse_sync.outbox_reactive_log r
           WHERE r.event_id = e.event_id
             AND r.handler = ANY($2)
        )
      ORDER BY e.occurred_at ASC
      LIMIT $3`,
    [
      triggerEventTypes,

      // Pre-compute every possible handler key for the trigger events. Keeps
      // the NOT EXISTS subquery tight and indexable.
      triggerEventTypes.flatMap(eventType =>
        getProjectionsForEvent(eventType, domain).map(projection =>
          buildReactiveHandlerKey(projection.name, eventType)
        )
      ),
      batchSize
    ]
  )

  if (events.length === 0) {
    return {
      runId,
      eventsFetched: 0,
      eventsAcknowledged: 0,
      scopesCoalesced: 0,
      projectionsTriggered: 0,
      scopeGroupsFailed: 0,
      scopeGroupsBreakerSkipped: 0,
      actions,
      perProjection,
      durationMs: Date.now() - startMs,
      eventsProcessed: 0,
      eventsFailed: 0
    }
  }

  // ── Phase B: categorize and group by scope ──
  //
  // For every event we either:
  //   (a) emit a no-op acknowledgement when no projection handles its type
  //       (this happens because the outbox can carry orphan event types
  //       inherited from migrations, or types the consumer used to handle),
  //   (b) emit a no-op:no-scope acknowledgement when the projection's
  //       extractScope returns null,
  //   (c) attach the event to a scope group keyed by
  //       (projection.name, scope.entityType, scope.entityId).
  // Every event ends up in exactly one of these three buckets — there is
  // no silent-skip path.

  const scopeGroups = new Map<string, ScopeGroup>()

  const noOpAcks: Array<{
    eventId: string
    handler: string
    result: string
    lastError: string | null
    retries: number
  }> = []

  for (const event of events) {
    let payload: Record<string, unknown>

    try {
      payload = parsePayload(event)
    } catch (error) {
      // Malformed payload — mark it as a no-op so it never blocks the queue.
      noOpAcks.push({
        eventId: event.event_id,
        handler: NO_HANDLER_SENTINEL,
        result: 'no-op:malformed-payload',
        lastError: errorMessage(error),
        retries: 0
      })
      continue
    }

    const projections = getProjectionsForEvent(event.event_type, domain)

    if (projections.length === 0) {
      noOpAcks.push({
        eventId: event.event_id,
        handler: NO_HANDLER_SENTINEL,
        result: SYSTEM_NO_OP_RESULT,
        lastError: null,
        retries: 0
      })
      continue
    }

    for (const projection of projections) {
      const handlerKey = buildReactiveHandlerKey(projection.name, event.event_type)

      let scope: { entityType: string; entityId: string } | null = null

      try {
        scope = projection.extractScope(payload)
      } catch (error) {
        // extractScope is supposed to be pure but if it throws we treat it
        // like a null scope to keep the queue moving.
        noOpAcks.push({
          eventId: event.event_id,
          handler: handlerKey,
          result: 'no-op:extract-scope-error',
          lastError: errorMessage(error),
          retries: 0
        })
        continue
      }

      if (!scope) {
        noOpAcks.push({
          eventId: event.event_id,
          handler: handlerKey,
          result: NO_SCOPE_RESULT,
          lastError: null,
          retries: 0
        })
        continue
      }

      const groupKey = `${projection.name}:${scope.entityType}:${scope.entityId}`
      const existing = scopeGroups.get(groupKey)

      if (existing) {
        existing.events.push(event)

        // Always keep the most recent payload as representative — tie-broken
        // by occurred_at order which is already ASC.
        existing.representativePayload = payload
      } else {
        scopeGroups.set(groupKey, {
          projection,
          scope,
          events: [event],
          representativePayload: payload
        })
      }
    }
  }

  // Acknowledge all no-op buckets up front so they're durably out of the
  // queue regardless of what happens to the scope groups below.
  await bulkAcknowledgeEvents(noOpAcks)

  for (const ack of noOpAcks) {
    if (ack.handler === NO_HANDLER_SENTINEL) continue
    const projectionName = ack.handler.split(':')[0]
    const stats = ensureProjectionStats(perProjection, projectionName)

    stats.eventsAcknowledged += 1
  }

  // ── Phase C: process each scope group ──
  //
  // For each group we:
  //   1. Consult the circuit breaker. If open, mark all events in the
  //      group as 'breaker:open' so they will be re-fetched on the next
  //      run (because we DON'T insert them into outbox_reactive_log) —
  //      actually we DO insert with result='breaker:open' to advance the
  //      metric and avoid the V1 silent-skip pathology. The breaker
  //      cooldown handles "try again later".
  //   2. Run projection.refresh() once for the group.
  //   3. On success, bulk-acknowledge all contributing events with
  //      'coalesced:N' so the metric reflects them processed.
  //   4. On failure, mark each event as 'retry' or 'dead-letter' based
  //      on its individual retry counter (preserves V1 semantics so
  //      ops-worker recovery cron can still pick stragglers).
  //   5. Update the circuit breaker counters either way.

  let eventsAcknowledged = noOpAcks.length

  for (const group of scopeGroups.values()) {
    const stats = ensureProjectionStats(perProjection, group.projection.name)

    const circuit = await evaluateCircuit(group.projection.name, breakerConfig)

    if (!circuit.allow) {
      // Mark contributing events with breaker state. They will be re-fetched
      // because the WHERE clause in Phase A excludes log entries for
      // (event_id, handler), and we DO insert log entries here. Wait — that
      // would prevent re-fetch. We want re-fetch after cooldown.
      //
      // Solution: leave events unmarked so they are re-fetched. The Phase A
      // query naturally re-includes them. Skipping a group here costs one
      // re-fetch round-trip per cooldown cycle, which is acceptable.
      scopeGroupsBreakerSkipped += 1
      stats.breakerSkips += 1
      actions.push(`[${group.projection.name}] breaker open — skipped scope ${group.scope.entityId} (${group.events.length} events)`)
      continue
    }

    const projectionStartMs = Date.now()
    const queueId = buildRefreshQueueId(group.projection.name, group.scope.entityType, group.scope.entityId)

    try {
      await enqueueRefresh({
        projectionName: group.projection.name,
        entityType: group.scope.entityType,
        entityId: group.scope.entityId,
        priority: group.projection.maxRetries ?? 2,
        triggeredByEventId: group.events[group.events.length - 1].event_id,
        maxRetries: group.projection.maxRetries ?? 2
      })

      const actionDescription = await group.projection.refresh(group.scope, group.representativePayload)

      // Acknowledge ALL contributing events in this group with one batch insert.
      const ackEntries = group.events.map(event => ({
        eventId: event.event_id,
        handler: buildReactiveHandlerKey(group.projection.name, event.event_type),
        result:
          actionDescription
            ? `${COALESCED_RESULT_PREFIX}:${actionDescription}`.slice(0, 1000)
            : `${COALESCED_RESULT_PREFIX}:no-op`,
        lastError: null,
        retries: 0
      }))

      await bulkAcknowledgeEvents(ackEntries)
      eventsAcknowledged += ackEntries.length
      stats.eventsAcknowledged += ackEntries.length
      stats.scopesCoalesced += 1
      stats.successes += 1
      stats.totalLatencyMs += Date.now() - projectionStartMs

      try {
        await markRefreshCompleted(queueId)
      } catch (completionError) {
        console.error(
          `[reactive-consumer] ${group.projection.name} queue completion failed for scope ${group.scope.entityId}:`,
          completionError
        )
      }

      await recordCircuitSuccess(group.projection.name, breakerConfig)

      if (actionDescription) {
        projectionsTriggered += 1
        actions.push(`[${group.projection.name}] ${actionDescription} (coalesced ${group.events.length} events)`)
      }
    } catch (error) {
      const err = classifyReactiveError(error)
      const errMsg = err.formattedMessage

      console.error(
        `[reactive-consumer] ${group.projection.name} failed for scope ${group.scope.entityId}:`,
        error
      )

      stats.failures += 1
      stats.totalLatencyMs += Date.now() - projectionStartMs
      scopeGroupsFailed += 1

      try {
        await markRefreshFailed(queueId, errMsg, group.projection.maxRetries ?? 2, {
          errorClass: err.category,
          errorFamily: err.family,
          isInfrastructureFault: err.isInfrastructure
        })
      } catch (failureError) {
        console.error('[reactive-consumer] markRefreshFailed orphan:', failureError)
      }

      // Per-event retry tracking — preserves V1 semantics.
      const maxRetries = group.projection.maxRetries ?? 2

      const retryEntries: Array<{
        eventId: string
        handler: string
        result: string
        lastError: string | null
        retries: number
        errorClass?: string | null
        errorFamily?: string | null
        isInfrastructureFault?: boolean
      }> = []

      for (const event of group.events) {
        const handlerKey = buildReactiveHandlerKey(group.projection.name, event.event_type)


        // Read prior retry count if any (per-handler).
        const priorRows = await runGreenhousePostgresQuery<{ retries: number }>(
          `SELECT COALESCE(retries, 0) AS retries
             FROM greenhouse_sync.outbox_reactive_log
            WHERE event_id = $1 AND handler = $2`,
          [event.event_id, handlerKey]
        ).catch(() => [] as Array<{ retries: number }>)

        const currentRetries = Number(priorRows[0]?.retries ?? 0)
        const nextRetries = currentRetries + 1
        const isDeadLetter = nextRetries >= maxRetries

        retryEntries.push({
          eventId: event.event_id,
          handler: handlerKey,
          result: isDeadLetter ? 'dead-letter' : 'retry',
          lastError: errMsg,
          retries: nextRetries,
          errorClass: err.category,
          errorFamily: err.family,
          isInfrastructureFault: err.isInfrastructure
        })

        if (isDeadLetter) {
          actions.push(`[${group.projection.name}] DEAD-LETTER event ${event.event_id}: ${errMsg}`)
        }
      }

      await bulkAcknowledgeEvents(retryEntries)
      eventsAcknowledged += retryEntries.length
      stats.eventsAcknowledged += retryEntries.length

      await recordCircuitFailure(group.projection.name, errMsg, breakerConfig)
    }
  }

  const finalResult: ReactiveConsumerResult = {
    runId,
    eventsFetched: events.length,
    eventsAcknowledged,
    scopesCoalesced: scopeGroups.size - scopeGroupsBreakerSkipped,
    projectionsTriggered,
    scopeGroupsFailed,
    scopeGroupsBreakerSkipped,
    actions,
    perProjection,
    durationMs: Date.now() - startMs,

    // Backwards-compat fields for ops-worker / Ops Health dashboards.
    eventsProcessed: eventsAcknowledged,
    eventsFailed: scopeGroupsFailed
  }

  // Emit Cloud Monitoring custom metrics. Wrapped in try/catch as defense in
  // depth — the emitter already swallows errors, but an unexpected throw from
  // inside it must not corrupt the consumer's return value.
  try {
    await emitConsumerRunMetrics(finalResult, { domain })
  } catch (error) {
    console.error('[reactive-consumer] emitConsumerRunMetrics threw unexpectedly:', error)
  }

  return finalResult
}
