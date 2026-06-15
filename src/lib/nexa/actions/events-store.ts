import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { NexaActionSensitivity } from './types'

/**
 * TASK-1137 — Append-only ledger of governed action lifecycle events. Observability + security:
 * the `unauthorized proposal rate` signal reads `proposal_denied`, the `failure rate` signal reads
 * `failed`. NEVER stores conversation content — only which action, which event, and why.
 */
export type NexaActionEventType =
  | 'proposed'
  | 'proposal_denied'
  | 'executed'
  | 'failed'
  | 'execution_denied'
  | 'conflict'
  | 'cancelled'

export interface NexaActionEventInput {
  userId: string
  actionKey: string
  eventType: NexaActionEventType
  reason?: string | null
  sensitivity?: NexaActionSensitivity | null
  idempotencyKey?: string | null
  replayed?: boolean
  detail?: Record<string, unknown> | null
}

/** Best-effort write — observability NEVER breaks the action or the conversation. */
export const recordNexaActionEvent = async (event: NexaActionEventInput): Promise<void> => {
  try {
    await query(
      `
        INSERT INTO greenhouse_ai.nexa_action_events (
          user_id, action_key, event_type, reason, sensitivity, idempotency_key, replayed, detail
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      `,
      [
        event.userId,
        event.actionKey,
        event.eventType,
        event.reason ?? null,
        event.sensitivity ?? null,
        event.idempotencyKey ?? null,
        event.replayed ?? false,
        event.detail ? JSON.stringify(event.detail) : null
      ]
    )
  } catch (error) {
    captureWithDomain(error, 'home', { tags: { source: 'nexa_action_events_store' } })
  }
}
