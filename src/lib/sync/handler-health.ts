import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Canonical handler health state machine.
 *
 * `greenhouse_sync.handler_health` holds ONE row per reactive handler with
 * the current state (`healthy` / `degraded` / `failed` / `quarantined`),
 * consecutive failure counters, and last-known error metadata. The reactive
 * worker UPSERTs this table on every invocation; KPIs and dashboards read
 * from here, not from the audit log (`outbox_reactive_log`).
 *
 * State machine:
 *
 *   success → healthy (reset counters)
 *   retry   → degraded after >= DEGRADED_THRESHOLD consecutive failures
 *   dead-letter → failed (immediate)
 *   quarantined ← manual operator action (or auto after long stall)
 *
 * The audit log keeps every attempt forever for forensics; the health table
 * is small (one row per handler, ~50 handlers) so KPIs are O(1).
 *
 * Spec: docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md
 */

const DEGRADED_THRESHOLD = 3

export type HandlerHealthState = 'healthy' | 'degraded' | 'failed' | 'quarantined'

export type HandlerOutcome = 'success' | 'retry' | 'dead-letter' | 'no-op' | 'skipped'

export interface HandlerHealthUpsertEntry {
  handler: string
  outcome: HandlerOutcome
  eventId: string
  errorClass?: string | null
  errorFamily?: string | null
}

const isFailureOutcome = (outcome: HandlerOutcome): boolean =>
  outcome === 'retry' || outcome === 'dead-letter'

const isSuccessOutcome = (outcome: HandlerOutcome): boolean =>
  outcome === 'success' || outcome === 'no-op' || outcome === 'skipped'

/**
 * Fold reactive handler invocations into the canonical health table.
 *
 * Idempotent: ON CONFLICT DO UPDATE recomputes counters from the previous
 * row + this entry. Calls run in a single transaction with the audit log
 * insert, so the two tables never drift.
 *
 * Also sets `recovered_at` on previous unacknowledged dead-letter rows for
 * the same handler when this attempt succeeds — the dead-letter is no
 * longer "active" the moment a later attempt of the same handler works.
 */
export const recordHandlerOutcomes = async (
  entries: HandlerHealthUpsertEntry[]
): Promise<void> => {
  if (entries.length === 0) return

  for (const entry of entries) {
    const isFailure = isFailureOutcome(entry.outcome)
    const isSuccess = isSuccessOutcome(entry.outcome)
    const isDeadLetter = entry.outcome === 'dead-letter'

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.handler_health (
         handler, current_state,
         consecutive_failures, consecutive_successes,
         total_dead_letter_count,
         last_failure_at, last_success_at,
         last_error_class, last_error_family,
         last_event_id, last_dead_letter_event_id,
         state_changed_at, updated_at
       )
       VALUES (
         $1,
         CASE
           WHEN $2::boolean THEN 'failed'   -- dead-letter immediately fails
           WHEN $3::boolean THEN 'degraded' -- retry => degraded after first
           WHEN $4::boolean THEN 'healthy'
           ELSE 'healthy'
         END,
         CASE WHEN $3::boolean OR $2::boolean THEN 1 ELSE 0 END,
         CASE WHEN $4::boolean THEN 1 ELSE 0 END,
         CASE WHEN $2::boolean THEN 1 ELSE 0 END,
         CASE WHEN $3::boolean OR $2::boolean THEN NOW() ELSE NULL END,
         CASE WHEN $4::boolean THEN NOW() ELSE NULL END,
         $5, $6, $7,
         CASE WHEN $2::boolean THEN $7 ELSE NULL END,
         NOW(), NOW()
       )
       ON CONFLICT (handler) DO UPDATE SET
         consecutive_failures =
           CASE
             WHEN $4::boolean THEN 0
             WHEN $3::boolean OR $2::boolean THEN handler_health.consecutive_failures + 1
             ELSE handler_health.consecutive_failures
           END,
         consecutive_successes =
           CASE
             WHEN $4::boolean THEN handler_health.consecutive_successes + 1
             ELSE 0
           END,
         total_dead_letter_count =
           handler_health.total_dead_letter_count + CASE WHEN $2::boolean THEN 1 ELSE 0 END,
         total_recovered_count =
           handler_health.total_recovered_count + CASE
             WHEN $4::boolean AND handler_health.current_state IN ('degraded','failed') THEN 1
             ELSE 0
           END,
         last_failure_at =
           CASE WHEN $3::boolean OR $2::boolean THEN NOW() ELSE handler_health.last_failure_at END,
         last_success_at =
           CASE WHEN $4::boolean THEN NOW() ELSE handler_health.last_success_at END,
         last_error_class =
           CASE WHEN $3::boolean OR $2::boolean THEN $5 ELSE handler_health.last_error_class END,
         last_error_family =
           CASE WHEN $3::boolean OR $2::boolean THEN $6 ELSE handler_health.last_error_family END,
         last_event_id = $7,
         last_dead_letter_event_id =
           CASE WHEN $2::boolean THEN $7 ELSE handler_health.last_dead_letter_event_id END,
         current_state =
           CASE
             WHEN $2::boolean THEN 'failed'
             WHEN handler_health.current_state = 'quarantined' THEN 'quarantined'
             WHEN $4::boolean THEN 'healthy'
             WHEN ($3::boolean OR $2::boolean)
               AND handler_health.consecutive_failures + 1 >= ${DEGRADED_THRESHOLD} THEN 'degraded'
             ELSE handler_health.current_state
           END,
         state_changed_at =
           CASE
             WHEN handler_health.current_state <> (
               CASE
                 WHEN $2::boolean THEN 'failed'
                 WHEN handler_health.current_state = 'quarantined' THEN 'quarantined'
                 WHEN $4::boolean THEN 'healthy'
                 WHEN ($3::boolean OR $2::boolean)
                   AND handler_health.consecutive_failures + 1 >= ${DEGRADED_THRESHOLD} THEN 'degraded'
                 ELSE handler_health.current_state
               END
             ) THEN NOW()
             ELSE handler_health.state_changed_at
           END,
         updated_at = NOW()`,
      [
        entry.handler,
        isDeadLetter,
        isFailure && !isDeadLetter,
        isSuccess,
        entry.errorClass ?? null,
        entry.errorFamily ?? null,
        entry.eventId
      ]
    )

    // Mark previous unacknowledged dead-letters as recovered when this
    // attempt succeeds — the handler proved it can process again.
    if (isSuccess) {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_sync.outbox_reactive_log
            SET recovered_at = NOW()
          WHERE handler = $1
            AND result = 'dead-letter'
            AND acknowledged_at IS NULL
            AND recovered_at IS NULL`,
        [entry.handler]
      )
    }
  }
}

export interface HandlerHealthSnapshot extends Record<string, unknown> {
  handler: string
  current_state: HandlerHealthState
  consecutive_failures: number
  total_dead_letter_count: number
  last_failure_at: string | null
  last_success_at: string | null
  last_error_class: string | null
  last_error_family: string | null
  last_dead_letter_event_id: string | null
  state_changed_at: string
}

/**
 * Read the current state of every handler that is NOT healthy. Powers the
 * Admin Center "handlers degradados" KPI.
 */
export const listUnhealthyHandlers = async (): Promise<HandlerHealthSnapshot[]> => {
  return await runGreenhousePostgresQuery<HandlerHealthSnapshot>(
    `SELECT handler, current_state, consecutive_failures,
            total_dead_letter_count,
            last_failure_at, last_success_at,
            last_error_class, last_error_family,
            last_dead_letter_event_id,
            state_changed_at
       FROM greenhouse_sync.handler_health
      WHERE current_state <> 'healthy'
      ORDER BY
        CASE current_state
          WHEN 'failed' THEN 0
          WHEN 'quarantined' THEN 1
          WHEN 'degraded' THEN 2
          ELSE 3
        END,
        last_failure_at DESC NULLS LAST`
  )
}

/**
 * Manual acknowledgment: an operator marks the active dead-letters of a
 * handler as resolved. The audit rows stay in place for forensics, but
 * they no longer count toward the KPI. Optionally transitions the handler
 * back to healthy if the operator confirms the underlying issue is fixed.
 */
export interface AcknowledgeHandlerDeadLettersInput {
  handler: string
  acknowledgedBy: string
  resolutionNote?: string | null
  transitionToHealthy?: boolean
}

export interface AcknowledgeHandlerDeadLettersResult {
  acknowledgedRows: number
  newState: HandlerHealthState
}

export const acknowledgeHandlerDeadLetters = async (
  input: AcknowledgeHandlerDeadLettersInput
): Promise<AcknowledgeHandlerDeadLettersResult> => {
  const { handler, acknowledgedBy, resolutionNote = null, transitionToHealthy = true } = input

  const ackRows = await runGreenhousePostgresQuery<{ count: string }>(
    `WITH updated AS (
       UPDATE greenhouse_sync.outbox_reactive_log
          SET acknowledged_at = NOW(),
              acknowledged_by = $2,
              resolution_note = $3
        WHERE handler = $1
          AND result = 'dead-letter'
          AND acknowledged_at IS NULL
          AND recovered_at IS NULL
        RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM updated`,
    [handler, acknowledgedBy, resolutionNote]
  )

  const acknowledgedRows = Number.parseInt(ackRows[0]?.count ?? '0', 10)

  if (transitionToHealthy) {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.handler_health
          SET current_state = 'healthy',
              consecutive_failures = 0,
              state_changed_at = NOW(),
              updated_at = NOW()
        WHERE handler = $1
          AND current_state <> 'healthy'`,
      [handler]
    )

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.handler_health_transitions
         (handler, from_state, to_state, reason)
       SELECT handler, current_state, 'healthy',
              'manual_ack:' || $2 || COALESCE(' :: ' || $3, '')
         FROM greenhouse_sync.handler_health
        WHERE handler = $1`,
      [handler, acknowledgedBy, resolutionNote]
    )
  }

  const stateRow = await runGreenhousePostgresQuery<{ current_state: HandlerHealthState }>(
    `SELECT current_state FROM greenhouse_sync.handler_health WHERE handler = $1`,
    [handler]
  )

  return {
    acknowledgedRows,
    newState: stateRow[0]?.current_state ?? 'healthy'
  }
}
