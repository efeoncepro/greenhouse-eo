import 'server-only'

import { sql } from 'kysely'

import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { getDb } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { recordAssignmentEvent } from './audit'
import { ClientPortalValidationError } from './errors'

/**
 * TASK-826 Slice 4 — Terminal transitions del assignment.
 *
 * `expireClientPortalModule`:
 *   - Use case: pilot timeout (expires_at vencido) o terminate operativo planeado.
 *   - SET effective_to = hoy + status = 'expired'.
 *   - Outbox: `client.portal.module.assignment.expired` v1.
 *
 * `churnClientPortalModule`:
 *   - Use case: post-offboarding del cliente, terminal definitivo.
 *   - SET effective_to = hoy + status = 'churned'.
 *   - Outbox: `client.portal.module.assignment.churned` v1 (semántica distinta —
 *     churn implica relación comercial terminada, expire NO necesariamente).
 *
 * **Terminal status NO re-activable**: re-llamar `enableClientPortalModule`
 * para un (org, module) requiere que `effective_to` esté seteado o
 * que NO exista assignment activo. Re-enable después de churn crea un assignment
 * NUEVO con audit chain limpia — el churn anterior queda inmutable.
 *
 * Idempotency:
 *   - Expire/churn de un assignment ya en su target terminal status → no-op.
 *   - Pero como `effective_to` también se setea, idempotency check usa
 *     `effective_to IS NOT NULL AND status === target`.
 */

export interface TerminalTransitionInput {
  readonly assignmentId: string
  readonly actorUserId: string
  readonly reason?: string

  /** ISO date `YYYY-MM-DD`. Default: hoy. */
  readonly effectiveTo?: string
}

export interface TerminalTransitionResult {
  readonly assignmentId: string
  readonly fromStatus: string
  readonly toStatus: 'expired' | 'churned'
  readonly effectiveTo: string
  readonly idempotent: boolean
}

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

const applyTerminalTransition = async (
  input: TerminalTransitionInput,
  options: {
    toStatus: 'expired' | 'churned'
    eventType: string
    eventKind: 'expired' | 'churned'
  }
): Promise<TerminalTransitionResult> => {
  const db = await getDb()
  const effectiveTo = input.effectiveTo ?? todayIsoDate()

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

    // Idempotency: already in target terminal status with effective_to set
    if (existing.status === options.toStatus && existing.effective_to !== null) {
      const existingEffectiveTo =
        existing.effective_to instanceof Date
          ? existing.effective_to.toISOString().slice(0, 10)
          : String(existing.effective_to)

      return {
        assignmentId: existing.assignment_id,
        fromStatus: existing.status,
        toStatus: options.toStatus,
        effectiveTo: existingEffectiveTo,
        idempotent: true,
        organizationId: existing.organization_id,
        moduleKey: existing.module_key
      }
    }

    // Closed but to a different terminal (e.g. churned, requesting expire) →
    // conflict, operator must not re-flip terminal status.
    if (existing.effective_to !== null) {
      throw new ClientPortalValidationError(
        `Assignment '${input.assignmentId}' is already closed with status='${existing.status}'; cannot transition to '${options.toStatus}'`,
        409,
        {
          assignmentId: input.assignmentId,
          currentStatus: existing.status,
          currentEffectiveTo: existing.effective_to,
          requestedStatus: options.toStatus
        }
      )
    }

    await tx
      .updateTable('greenhouse_client_portal.module_assignments')
      .set({
        status: options.toStatus,
        effective_to: effectiveTo,
        updated_at: sql`CURRENT_TIMESTAMP` as never
      })
      .where('assignment_id', '=', input.assignmentId)
      .execute()

    await recordAssignmentEvent(
      {
        assignmentId: input.assignmentId,
        eventKind: options.eventKind,
        fromStatus: existing.status,
        toStatus: options.toStatus,
        actorUserId: input.actorUserId,
        payload: {
          reason: input.reason,
          effectiveTo,
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
          effectiveTo,
          actorUserId: input.actorUserId
        }
      },
      tx
    )

    return {
      assignmentId: existing.assignment_id,
      fromStatus: existing.status,
      toStatus: options.toStatus,
      effectiveTo,
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
    effectiveTo: result.effectiveTo,
    idempotent: result.idempotent
  }
}

export const expireClientPortalModule = async (
  input: TerminalTransitionInput
): Promise<TerminalTransitionResult> =>
  applyTerminalTransition(input, {
    toStatus: 'expired',
    eventType: 'client.portal.module.assignment.expired',
    eventKind: 'expired'
  })

export const churnClientPortalModule = async (
  input: TerminalTransitionInput
): Promise<TerminalTransitionResult> =>
  applyTerminalTransition(input, {
    toStatus: 'churned',
    eventType: 'client.portal.module.assignment.churned',
    eventKind: 'churned'
  })
