import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { BeneficiaryPaymentProfileSafe } from '@/types/payment-profiles'

import { writeProfileAuditEntry } from './audit'
import { PaymentProfileConflictError, PaymentProfileValidationError } from './errors'
import { mapProfileRowSafe, type ProfileRow } from './row-mapper'

export interface ApprovePaymentProfileInput {
  profileId: string
  approvedBy: string
  approvedByEmail?: string | null
}

/**
 * Aprueba un perfil en estado `pending_approval` y lo transiciona a
 * `active`. Si ya existe un `active` para la misma (space, beneficiary,
 * currency), el viejo queda `superseded` por el nuevo en la misma
 * transaccion (atomico).
 *
 * Maker-checker: triple defensa (DB trigger + helper TS + UI). Aqui se
 * valida en TS antes de hacer el UPDATE para devolver un error claro.
 */
export async function approvePaymentProfile(
  input: ApprovePaymentProfileInput,
  client?: PoolClient
): Promise<{ profile: BeneficiaryPaymentProfileSafe; eventId: string; supersededProfileId: string | null }> {
  if (!input.profileId) throw new PaymentProfileValidationError('profileId requerido')
  if (!input.approvedBy) throw new PaymentProfileValidationError('approvedBy requerido')

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

    if (row.status !== 'pending_approval' && row.status !== 'draft') {
      throw new PaymentProfileConflictError(
        `Solo se puede aprobar desde 'pending_approval' o 'draft'. Estado actual: ${row.status}`,
        'invalid_state'
      )
    }

    if (row.require_approval && row.created_by === input.approvedBy) {
      throw new PaymentProfileConflictError(
        `Maker-checker: el creador (${row.created_by}) no puede aprobar su propio perfil`,
        'maker_checker_violation',
        403
      )
    }

    // Si existe otro `active` para la misma key canonica, lo supersede
    // ANTES de activar el nuevo (asi el unique partial index nunca
    // ve dos `active` simultaneos).
    const existingActive = await c.query<{ profile_id: string }>(
      `SELECT profile_id
         FROM greenhouse_finance.beneficiary_payment_profiles
        WHERE COALESCE(space_id, '__no_space__') = COALESCE($1::text, '__no_space__')
          AND beneficiary_type = $2
          AND beneficiary_id = $3
          AND currency = $4
          AND status = 'active'
          AND profile_id <> $5
        FOR UPDATE`,
      [row.space_id, row.beneficiary_type, row.beneficiary_id, row.currency, input.profileId]
    )

    let supersededProfileId: string | null = null

    if ((existingActive.rowCount ?? 0) > 0) {
      supersededProfileId = existingActive.rows[0].profile_id

      await c.query(
        `UPDATE greenhouse_finance.beneficiary_payment_profiles
            SET status = 'superseded',
                superseded_by = $2,
                active_to = CURRENT_DATE,
                updated_at = now()
          WHERE profile_id = $1`,
        [supersededProfileId, input.profileId]
      )

      await writeProfileAuditEntry(c, {
        profileId: supersededProfileId,
        action: 'superseded',
        actorUserId: input.approvedBy,
        actorEmail: input.approvedByEmail ?? null,
        diff: { supersededBy: input.profileId, reason: 'replaced_by_new_approval' }
      })

      await publishOutboxEvent(
        {
          aggregateType: 'beneficiary_payment_profile',
          aggregateId: supersededProfileId,
          eventType: 'finance.beneficiary_payment_profile.superseded',
          payload: {
            profileId: supersededProfileId,
            supersededBy: input.profileId,
            actorUserId: input.approvedBy
          }
        },
        c
      )
    }

    // Activar el nuevo perfil
    const updated = await c.query<ProfileRow>(
      `UPDATE greenhouse_finance.beneficiary_payment_profiles
          SET status = 'active',
              approved_by = $2,
              approved_at = now(),
              active_from = COALESCE(active_from, CURRENT_DATE),
              updated_at = now()
        WHERE profile_id = $1
        RETURNING *`,
      [input.profileId, input.approvedBy]
    )

    const profile = mapProfileRowSafe(updated.rows[0])

    await writeProfileAuditEntry(c, {
      profileId: profile.profileId,
      action: 'approved',
      actorUserId: input.approvedBy,
      actorEmail: input.approvedByEmail ?? null,
      diff: { previousStatus: row.status, newStatus: 'active', supersededProfileId }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'beneficiary_payment_profile',
        aggregateId: profile.profileId,
        eventType: 'finance.beneficiary_payment_profile.approved',
        payload: {
          profileId: profile.profileId,
          approvedBy: input.approvedBy,
          supersededProfileId,
          beneficiaryType: profile.beneficiaryType,
          beneficiaryId: profile.beneficiaryId,
          currency: profile.currency,
          providerSlug: profile.providerSlug
        }
      },
      c
    )

    return { profile, eventId, supersededProfileId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
