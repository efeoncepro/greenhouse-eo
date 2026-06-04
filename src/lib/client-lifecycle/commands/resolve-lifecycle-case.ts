import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { instantiateClientForParty } from '@/lib/commercial/party/commands/instantiate-client-for-party'
import { OrganizationAlreadyHasClientError } from '@/lib/commercial/party/types'

import { getCaseById } from '../store'
import {
  ClientLifecycleValidationError,
  type ResolveLifecycleCaseResult
} from '../types'
import { assertCaseTransition } from '../state-machine'
import { insertCaseEvent, publishLifecycleEvent, LIFECYCLE_EVENT_TYPES } from './command-helpers'

const MIN_REASON_LENGTH = 20

export interface ResolveLifecycleCaseInput {
  caseId: string
  resolution: 'completed' | 'cancelled'
  resolutionReason?: string
  overrideBlockers?: boolean
  overrideReason?: string
  actorUserId: string
}

const countPendingRequiredBlocking = async (client: PoolClient, caseId: string): Promise<number> => {
  const result = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
     FROM greenhouse_core.client_lifecycle_checklist_items
     WHERE case_id = $1
       AND required = TRUE
       AND blocks_completion = TRUE
       AND status NOT IN ('completed','skipped','not_applicable')`,
    [caseId]
  )


  return Number(result.rows[0]?.n ?? 0)
}

/**
 * Resolve a lifecycle case (completed | cancelled), atomic + idempotent.
 * On onboarding completion, cascades instantiateClientForParty if the client does
 * not yet exist (the organization row is never written here).
 */
export const resolveLifecycleCase = async (
  input: ResolveLifecycleCaseInput,
  existingClient?: PoolClient
): Promise<ResolveLifecycleCaseResult> => {
  const run = async (client: PoolClient): Promise<ResolveLifecycleCaseResult> => {
    const caseRow = await getCaseById(input.caseId, client, true)

    if (!caseRow) {
      throw new ClientLifecycleValidationError('case_not_found', 'El caso no existe.', 404)
    }

    // Idempotency: re-resolving to the same terminal status is a no-op.
    if (caseRow.status === 'completed' || caseRow.status === 'cancelled') {
      if (caseRow.status === input.resolution) {
        return { caseId: caseRow.caseId, finalStatus: caseRow.status, sideEffectsTriggered: [], idempotent: true }
      }

      throw new ClientLifecycleValidationError(
        'case_already_resolved',
        `El caso ya está ${caseRow.status}; no puede cambiarse a ${input.resolution}.`,
        409,
        { status: caseRow.status }
      )
    }

    assertCaseTransition(caseRow.status, input.resolution)

    if (input.resolution === 'cancelled') {
      if (!input.resolutionReason || input.resolutionReason.trim().length < MIN_REASON_LENGTH) {
        throw new ClientLifecycleValidationError(
          'cancellation_reason_required',
          `La cancelación requiere una razón de al menos ${MIN_REASON_LENGTH} caracteres.`,
          400
        )
      }
    }

    if (input.resolution === 'completed') {
      if (input.overrideBlockers) {
        if (!input.overrideReason || input.overrideReason.trim().length < MIN_REASON_LENGTH) {
          throw new ClientLifecycleValidationError(
            'override_reason_required',
            `El override requiere una razón de al menos ${MIN_REASON_LENGTH} caracteres.`,
            400
          )
        }

        // Authorize the DB transition trigger for this transaction only.
        await client.query(`SELECT set_config('app.client_lifecycle_blocker_override', 'true', true)`)
      } else {
        const pending = await countPendingRequiredBlocking(client, input.caseId)

        if (pending > 0) {
          throw new ClientLifecycleValidationError(
            'required_items_pending',
            `No se puede completar: ${pending} ítem(s) requerido(s) pendiente(s).`,
            409,
            { pending }
          )
        }

        if (caseRow.blockedReasonCodes.length > 0) {
          throw new ClientLifecycleValidationError(
            'blockers_pending',
            'No se puede completar con bloqueos activos sin override.',
            409,
            { blockedReasonCodes: caseRow.blockedReasonCodes }
          )
        }
      }
    }

    const timestampColumn = input.resolution === 'completed' ? 'completed_at' : 'cancelled_at'

    await client.query(
      `UPDATE greenhouse_core.client_lifecycle_cases
       SET status = $2,
           ${timestampColumn} = now(),
           cancellation_reason = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancellation_reason END
       WHERE case_id = $1`,
      [input.caseId, input.resolution, input.resolutionReason ?? null]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: 'closed',
      fromStatus: caseRow.status,
      toStatus: input.resolution,
      actorUserId: input.actorUserId,
      payload: { overrideBlockers: Boolean(input.overrideBlockers) }
    })

    const sideEffectsTriggered: string[] = []

    if (input.resolution === 'completed') {
      await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleCaseCompleted, input.caseId, {
        caseKind: caseRow.caseKind,
        organizationId: caseRow.organizationId
      })

      if (input.overrideBlockers) {
        await insertCaseEvent(client, {
          caseId: input.caseId,
          eventKind: 'blocker_overridden',
          actorUserId: input.actorUserId,
          payload: { blockedReasonCodes: caseRow.blockedReasonCodes }
        })
        await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleBlockerOverridden, input.caseId, {
          blockedReasonCodes: caseRow.blockedReasonCodes
        })
        sideEffectsTriggered.push('blocker_overridden')
      }

      // Cascade: onboarding completion instantiates the client if it does not exist.
      if (caseRow.caseKind === 'onboarding') {
        try {
          const result = await instantiateClientForParty(
            {
              organizationId: caseRow.organizationId,
              triggerEntity: { type: 'manual', id: caseRow.caseId },
              actor: { userId: input.actorUserId }
            },
            client
          )

          await client.query(
            `UPDATE greenhouse_core.client_lifecycle_cases SET client_id = $2 WHERE case_id = $1`,
            [input.caseId, result.clientId]
          )
          sideEffectsTriggered.push('client_instantiated')
        } catch (error) {
          if (error instanceof OrganizationAlreadyHasClientError) {
            const existing = await client.query<{ client_id: string }>(
              `SELECT cp.client_id
               FROM greenhouse_finance.client_profiles cp
               WHERE cp.organization_id = $1
               ORDER BY cp.created_at ASC LIMIT 1`,
              [caseRow.organizationId]
            )

            const existingClientId = existing.rows[0]?.client_id

            if (existingClientId) {
              await client.query(
                `UPDATE greenhouse_core.client_lifecycle_cases SET client_id = $2 WHERE case_id = $1`,
                [input.caseId, existingClientId]
              )
            }

            sideEffectsTriggered.push('client_already_exists')
          } else {
            throw error
          }
        }
      }
    } else {
      await publishLifecycleEvent(client, LIFECYCLE_EVENT_TYPES.clientLifecycleCaseCancelled, input.caseId, {
        caseKind: caseRow.caseKind,
        organizationId: caseRow.organizationId
      })
    }

    return {
      caseId: input.caseId,
      finalStatus: input.resolution,
      sideEffectsTriggered,
      idempotent: false
    }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
