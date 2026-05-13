import 'server-only'

import { sql } from 'kysely'

import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { getDb } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { recordAssignmentEvent } from './audit'
import { ClientPortalValidationError } from './errors'

/**
 * TASK-826 Slice 3 — Pause / resume del assignment.
 *
 * Transitions canónicas:
 *   - `pauseClientPortalModule`:  active|pilot → paused
 *   - `resumeClientPortalModule`: paused → active
 *
 * Ambas son atómicas (1 sola tx PG con UPDATE + audit + outbox) + post-tx cache
 * invalidation scoped al org afectado.
 *
 * Idempotency:
 *   - Pause de un assignment ya `paused` → no-op (idempotent=true)
 *   - Resume de un assignment ya `active` → no-op (idempotent=true)
 *
 * Error cases:
 *   - Assignment no existe o `effective_to` ya seteado (terminal) → 404
 *   - Pause requested pero status terminal (`expired`/`churned`) → 409
 *   - Resume requested pero status no es `paused` → 409
 *
 * State machine completo:
 *   pending → active → paused ↔ active (pause/resume)
 *   active|pilot|paused → expired (TASK-826 Slice 4)
 *   * → churned (TASK-826 Slice 4)
 */

export interface PauseResumeInput {
  readonly assignmentId: string

  /** Operator-facing actor; goes to audit + outbox payload. */
  readonly actorUserId: string

  /** Optional reason context (logged in audit event payload). */
  readonly reason?: string
}

export interface PauseResumeResult {
  readonly assignmentId: string
  readonly fromStatus: string
  readonly toStatus: 'paused' | 'active'
  readonly idempotent: boolean
}

const TERMINAL_STATUSES = ['expired', 'churned'] as const

const updateAssignmentStatus = async (
  input: PauseResumeInput,
  options: {
    fromAllowed: ReadonlyArray<string>
    toStatus: 'paused' | 'active'
    eventType: string
    rejectMessage: (currentStatus: string) => string
  }
): Promise<PauseResumeResult> => {
  const db = await getDb()

  const result = await db.transaction().execute(async tx => {
    const existing = await tx
      .selectFrom('greenhouse_client_portal.module_assignments')
      .select(['assignment_id', 'organization_id', 'module_key', 'status', 'effective_to'])
      .where('assignment_id', '=', input.assignmentId)
      .executeTakeFirst()

    if (!existing) {
      throw new ClientPortalValidationError(
        `Assignment '${input.assignmentId}' not found`,
        404,
        { assignmentId: input.assignmentId }
      )
    }

    if (existing.effective_to !== null) {
      throw new ClientPortalValidationError(
        `Assignment '${input.assignmentId}' is closed (effective_to set); cannot transition`,
        409,
        { assignmentId: input.assignmentId, effectiveTo: existing.effective_to }
      )
    }

    if (TERMINAL_STATUSES.includes(existing.status as (typeof TERMINAL_STATUSES)[number])) {
      throw new ClientPortalValidationError(
        `Assignment '${input.assignmentId}' is in terminal status '${existing.status}'`,
        409,
        { assignmentId: input.assignmentId, currentStatus: existing.status }
      )
    }

    if (existing.status === options.toStatus) {
      return {
        assignmentId: existing.assignment_id,
        fromStatus: existing.status,
        toStatus: options.toStatus,
        idempotent: true,
        organizationId: existing.organization_id,
        moduleKey: existing.module_key
      }
    }

    if (!options.fromAllowed.includes(existing.status)) {
      throw new ClientPortalValidationError(
        options.rejectMessage(existing.status),
        409,
        { assignmentId: input.assignmentId, currentStatus: existing.status }
      )
    }

    await tx
      .updateTable('greenhouse_client_portal.module_assignments')
      .set({
        status: options.toStatus,
        updated_at: sql`CURRENT_TIMESTAMP` as never
      })
      .where('assignment_id', '=', input.assignmentId)
      .execute()

    await recordAssignmentEvent(
      {
        assignmentId: input.assignmentId,
        eventKind: 'status_changed',
        fromStatus: existing.status,
        toStatus: options.toStatus,
        actorUserId: input.actorUserId,
        payload: {
          reason: input.reason,
          transition: `${existing.status}_to_${options.toStatus}`
        }
      },
      tx
    )

    await publishOutboxEvent(
      {
        aggregateType: 'client_portal_module_assignment',
        aggregateId: input.assignmentId,
        eventType: options.eventType,
        payload: {
          version: 1,
          assignmentId: input.assignmentId,
          organizationId: existing.organization_id,
          moduleKey: existing.module_key,
          fromStatus: existing.status,
          toStatus: options.toStatus,
          actorUserId: input.actorUserId
        }
      },
      tx
    )

    return {
      assignmentId: existing.assignment_id,
      fromStatus: existing.status,
      toStatus: options.toStatus,
      idempotent: false,
      organizationId: existing.organization_id,
      moduleKey: existing.module_key
    }
  })

  if (!result.idempotent) {
    __clearClientPortalResolverCache(result.organizationId)
  }

  return {
    assignmentId: result.assignmentId,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    idempotent: result.idempotent
  }
}

export const pauseClientPortalModule = async (input: PauseResumeInput): Promise<PauseResumeResult> =>
  updateAssignmentStatus(input, {
    fromAllowed: ['active', 'pilot', 'pending'],
    toStatus: 'paused',
    eventType: 'client.portal.module.assignment.paused',
    rejectMessage: status =>
      `Assignment is in status '${status}'; pause requires status in (active, pilot, pending)`
  })

export const resumeClientPortalModule = async (input: PauseResumeInput): Promise<PauseResumeResult> =>
  updateAssignmentStatus(input, {
    fromAllowed: ['paused'],
    toStatus: 'active',
    eventType: 'client.portal.module.assignment.resumed',
    rejectMessage: status => `Assignment is in status '${status}'; resume requires status 'paused'`
  })
