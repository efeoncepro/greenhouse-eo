import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Canonical webhook endpoint health state machine.
 *
 * Mirror of `handler_health` for outbound webhook subscriptions. The
 * outbound dispatcher UPSERTs this table on every delivery attempt; KPIs
 * read from here, not from individual `webhook_deliveries` rows.
 *
 * Spec: `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (health
 * section to be added).
 */

const DEGRADED_THRESHOLD = 3

export type WebhookEndpointHealthState = 'healthy' | 'degraded' | 'failed' | 'quarantined'

export type WebhookOutcome = 'succeeded' | 'retry_scheduled' | 'dead_letter'

export interface WebhookEndpointHealthEntry {
  webhookSubscriptionId: string
  outcome: WebhookOutcome
  httpStatus: number | null
  errorMessage: string | null
}

const isFailureOutcome = (outcome: WebhookOutcome): boolean =>
  outcome === 'retry_scheduled' || outcome === 'dead_letter'

const isSuccessOutcome = (outcome: WebhookOutcome): boolean =>
  outcome === 'succeeded'

export const recordWebhookOutcome = async (
  entry: WebhookEndpointHealthEntry
): Promise<void> => {
  const isSuccess = isSuccessOutcome(entry.outcome)
  const isFailure = isFailureOutcome(entry.outcome)
  const isDeadLetter = entry.outcome === 'dead_letter'

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.webhook_endpoint_health (
       webhook_subscription_id, current_state,
       consecutive_failures, consecutive_successes,
       total_dead_letter_count, active_dead_letter_count,
       last_failure_at, last_success_at,
       last_http_status, last_error_message,
       last_dead_letter_at,
       state_changed_at, updated_at
     )
     VALUES (
       $1,
       CASE
         WHEN $2::boolean THEN 'failed'
         WHEN $3::boolean THEN 'degraded'
         WHEN $4::boolean THEN 'healthy'
         ELSE 'healthy'
       END,
       CASE WHEN $3::boolean OR $2::boolean THEN 1 ELSE 0 END,
       CASE WHEN $4::boolean THEN 1 ELSE 0 END,
       CASE WHEN $2::boolean THEN 1 ELSE 0 END,
       CASE WHEN $2::boolean THEN 1 ELSE 0 END,
       CASE WHEN $3::boolean OR $2::boolean THEN NOW() ELSE NULL END,
       CASE WHEN $4::boolean THEN NOW() ELSE NULL END,
       $5, $6,
       CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
       NOW(), NOW()
     )
     ON CONFLICT (webhook_subscription_id) DO UPDATE SET
       consecutive_failures =
         CASE
           WHEN $4::boolean THEN 0
           WHEN $3::boolean OR $2::boolean THEN webhook_endpoint_health.consecutive_failures + 1
           ELSE webhook_endpoint_health.consecutive_failures
         END,
       consecutive_successes =
         CASE
           WHEN $4::boolean THEN webhook_endpoint_health.consecutive_successes + 1
           ELSE 0
         END,
       total_dead_letter_count =
         webhook_endpoint_health.total_dead_letter_count + CASE WHEN $2::boolean THEN 1 ELSE 0 END,
       active_dead_letter_count =
         CASE
           WHEN $2::boolean THEN webhook_endpoint_health.active_dead_letter_count + 1
           WHEN $4::boolean THEN 0
           ELSE webhook_endpoint_health.active_dead_letter_count
         END,
       last_failure_at =
         CASE WHEN $3::boolean OR $2::boolean THEN NOW() ELSE webhook_endpoint_health.last_failure_at END,
       last_success_at =
         CASE WHEN $4::boolean THEN NOW() ELSE webhook_endpoint_health.last_success_at END,
       last_http_status = COALESCE($5, webhook_endpoint_health.last_http_status),
       last_error_message =
         CASE WHEN $3::boolean OR $2::boolean THEN $6 ELSE webhook_endpoint_health.last_error_message END,
       last_dead_letter_at =
         CASE WHEN $2::boolean THEN NOW() ELSE webhook_endpoint_health.last_dead_letter_at END,
       current_state =
         CASE
           WHEN $2::boolean THEN 'failed'
           WHEN webhook_endpoint_health.current_state = 'quarantined' THEN 'quarantined'
           WHEN $4::boolean THEN 'healthy'
           WHEN ($3::boolean OR $2::boolean)
             AND webhook_endpoint_health.consecutive_failures + 1 >= ${DEGRADED_THRESHOLD} THEN 'degraded'
           ELSE webhook_endpoint_health.current_state
         END,
       state_changed_at =
         CASE
           WHEN webhook_endpoint_health.current_state <> (
             CASE
               WHEN $2::boolean THEN 'failed'
               WHEN webhook_endpoint_health.current_state = 'quarantined' THEN 'quarantined'
               WHEN $4::boolean THEN 'healthy'
               WHEN ($3::boolean OR $2::boolean)
                 AND webhook_endpoint_health.consecutive_failures + 1 >= ${DEGRADED_THRESHOLD} THEN 'degraded'
               ELSE webhook_endpoint_health.current_state
             END
           ) THEN NOW()
           ELSE webhook_endpoint_health.state_changed_at
         END,
       updated_at = NOW()`,
    [
      entry.webhookSubscriptionId,
      isDeadLetter,
      isFailure && !isDeadLetter,
      isSuccess,
      entry.httpStatus,
      entry.errorMessage
    ]
  )
}

export interface AcknowledgeWebhookDeadLettersInput {
  webhookSubscriptionId: string
  acknowledgedBy: string
  resolutionNote?: string | null
}

export interface AcknowledgeWebhookDeadLettersResult {
  acknowledgedRows: number
  newState: WebhookEndpointHealthState
}

export const acknowledgeWebhookDeadLetters = async (
  input: AcknowledgeWebhookDeadLettersInput
): Promise<AcknowledgeWebhookDeadLettersResult> => {
  const { webhookSubscriptionId, acknowledgedBy, resolutionNote = null } = input

  const ackRows = await runGreenhousePostgresQuery<{ count: string }>(
    `WITH updated AS (
       UPDATE greenhouse_sync.webhook_deliveries
          SET acknowledged_at = NOW(),
              acknowledged_by = $2,
              resolution_note = $3
        WHERE webhook_subscription_id = $1
          AND status = 'dead_letter'
          AND acknowledged_at IS NULL
          AND archived_at IS NULL
        RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM updated`,
    [webhookSubscriptionId, acknowledgedBy, resolutionNote]
  )

  const acknowledgedRows = Number.parseInt(ackRows[0]?.count ?? '0', 10)

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.webhook_endpoint_health
        SET active_dead_letter_count = 0,
            current_state = 'healthy',
            consecutive_failures = 0,
            state_changed_at = NOW(),
            updated_at = NOW()
      WHERE webhook_subscription_id = $1
        AND current_state <> 'healthy'`,
    [webhookSubscriptionId]
  )

  const stateRow = await runGreenhousePostgresQuery<{ current_state: WebhookEndpointHealthState }>(
    `SELECT current_state FROM greenhouse_sync.webhook_endpoint_health WHERE webhook_subscription_id = $1`,
    [webhookSubscriptionId]
  )

  return {
    acknowledgedRows,
    newState: stateRow[0]?.current_state ?? 'healthy'
  }
}
