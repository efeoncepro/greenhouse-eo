import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { BeneficiaryPaymentProfileSafe } from '@/types/payment-profiles'

import { writeProfileAuditEntry } from './audit'
import { PaymentProfileConflictError, PaymentProfileValidationError } from './errors'
import { mapProfileRowSafe, type ProfileRow } from './row-mapper'

export interface CancelPaymentProfileInput {
  profileId: string
  cancelledBy: string
  cancelledByEmail?: string | null
  reason: string
}

const cancellableStates = new Set(['draft', 'pending_approval', 'active'])

export async function cancelPaymentProfile(
  input: CancelPaymentProfileInput,
  client?: PoolClient
): Promise<{ profile: BeneficiaryPaymentProfileSafe; eventId: string }> {
  if (!input.profileId) throw new PaymentProfileValidationError('profileId requerido')
  if (!input.cancelledBy) throw new PaymentProfileValidationError('cancelledBy requerido')

  if (!input.reason || input.reason.trim().length < 3) {
    throw new PaymentProfileValidationError('reason debe tener al menos 3 caracteres')
  }

  const run = async (c: PoolClient) => {
    const current = await c.query<ProfileRow>(
      `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles
        WHERE profile_id = $1
        FOR UPDATE`,
      [input.profileId]
    )

    if ((current.rowCount ?? 0) === 0) {
      throw new PaymentProfileValidationError(
        `Profile ${input.profileId} no existe`,
        'not_found',
        404
      )
    }

    const row = current.rows[0]

    if (!cancellableStates.has(row.status)) {
      throw new PaymentProfileConflictError(
        `No se puede cancelar desde estado ${row.status}`,
        'invalid_state'
      )
    }

    const updated = await c.query<ProfileRow>(
      `UPDATE greenhouse_finance.beneficiary_payment_profiles
          SET status = 'cancelled',
              cancelled_by = $2,
              cancelled_reason = $3,
              cancelled_at = now(),
              active_to = CURRENT_DATE,
              updated_at = now()
        WHERE profile_id = $1
        RETURNING *`,
      [input.profileId, input.cancelledBy, input.reason.trim()]
    )

    const profile = mapProfileRowSafe(updated.rows[0])

    await writeProfileAuditEntry(c, {
      profileId: profile.profileId,
      action: 'cancelled',
      actorUserId: input.cancelledBy,
      actorEmail: input.cancelledByEmail ?? null,
      reason: input.reason.trim(),
      diff: { previousStatus: row.status, newStatus: 'cancelled' }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'beneficiary_payment_profile',
        aggregateId: profile.profileId,
        eventType: 'finance.beneficiary_payment_profile.cancelled',
        payload: {
          profileId: profile.profileId,
          cancelledBy: input.cancelledBy,
          reason: input.reason.trim(),
          previousStatus: row.status
        }
      },
      c
    )

    return { profile, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
