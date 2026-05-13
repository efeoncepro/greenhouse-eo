import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql, type Kysely, type Transaction } from 'kysely'

import type { DB } from '@/types/db'

/**
 * TASK-826 Slice 1 — Append-only audit log writer for module_assignment_events.
 *
 * Patrón canónico: cada mutación de `module_assignments` (enable/pause/
 * resume/expire/churn) llama este helper en la misma tx para registrar el
 * cambio. La tabla tiene triggers anti-UPDATE/DELETE (TASK-824), así que
 * lo insertado queda inmutable.
 *
 * Spec V1.4 §5.3 + §7 documenta el contract.
 *
 * Usage:
 *   ```ts
 *   await recordAssignmentEvent(
 *     {
 *       assignmentId,
 *       eventKind: 'enabled',
 *       toStatus: 'active',
 *       actorUserId,
 *       payload: { source, reason }
 *     },
 *     tx
 *   )
 *   ```
 */

type DbLike = Kysely<DB> | Transaction<DB>

/**
 * Allowed event_kind values per spec V1.4 §5.3.
 *
 * Mirror del comment en la columna (no DB CHECK enum porque event_kind es
 * descriptive, no transitional — runtime tolera valores adicionales). Pero
 * en TS lo cerramos para drift detection compile-time.
 */
export type AssignmentEventKind =
  | 'enabled'
  | 'status_changed'
  | 'expired'
  | 'paused'
  | 'resumed'
  | 'churned'
  | 'reason_updated'
  | 'migrated'

export interface RecordAssignmentEventInput {
  readonly assignmentId: string
  readonly eventKind: AssignmentEventKind
  readonly fromStatus?: string | null
  readonly toStatus?: string | null
  readonly payload?: Record<string, unknown>
  readonly actorUserId: string
}

/**
 * Inserts an append-only event row into `module_assignment_events`.
 *
 * The tx parameter is required — this helper NEVER writes outside a parent
 * transaction (audit must be atomic with the mutation that triggered it).
 *
 * Returns the generated `event_id` (`cpmae-{uuid}`).
 */
export const recordAssignmentEvent = async (
  input: RecordAssignmentEventInput,
  tx: DbLike
): Promise<string> => {
  const eventId = `cpmae-${randomUUID()}`

  await tx
    .insertInto('greenhouse_client_portal.module_assignment_events')
    .values({
      event_id: eventId,
      assignment_id: input.assignmentId,
      event_kind: input.eventKind,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      payload_json: (input.payload ?? {}) as never,
      actor_user_id: input.actorUserId,
      occurred_at: sql`CURRENT_TIMESTAMP` as never
    })
    .execute()

  return eventId
}
