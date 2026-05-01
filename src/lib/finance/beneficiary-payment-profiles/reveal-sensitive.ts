import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { BeneficiaryPaymentProfileWithSensitive } from '@/types/payment-profiles'

import { writeProfileAuditEntry } from './audit'
import { PaymentProfileValidationError } from './errors'
import { mapProfileRowWithSensitive, type ProfileRow } from './row-mapper'

export interface RevealSensitiveInput {
  profileId: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Devuelve el perfil con datos sensibles (`accountNumberFull`,
 * `vaultRef`) y registra entrada de audit + outbox event. Caller DEBE
 * haber validado capability `finance.payment_profiles.reveal_sensitive`
 * antes de llamar — este helper NO chequea autorizacion.
 *
 * Razon (`reason`) se persiste en audit log y event payload para que
 * un auditor pueda reconstruir POR QUE se revelaron datos sensibles.
 */
export async function revealPaymentProfileSensitive(
  input: RevealSensitiveInput,
  client?: PoolClient
): Promise<{ profile: BeneficiaryPaymentProfileWithSensitive; auditId: string; eventId: string }> {
  if (!input.profileId) throw new PaymentProfileValidationError('profileId requerido')
  if (!input.actorUserId) throw new PaymentProfileValidationError('actorUserId requerido')

  if (!input.reason || input.reason.trim().length < 5) {
    throw new PaymentProfileValidationError(
      'reason debe tener al menos 5 caracteres (requerido para audit)',
      'reason_required'
    )
  }

  const run = async (c: PoolClient) => {
    const result = await c.query<ProfileRow>(
      `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles
        WHERE profile_id = $1
        LIMIT 1`,
      [input.profileId]
    )

    if ((result.rowCount ?? 0) === 0) {
      throw new PaymentProfileValidationError(
        `Profile ${input.profileId} no existe`,
        'not_found',
        404
      )
    }

    const row = result.rows[0]
    const profile = mapProfileRowWithSensitive(row, input.actorUserId)

    const auditId = await writeProfileAuditEntry(c, {
      profileId: profile.profileId,
      action: 'revealed_sensitive',
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.reason.trim(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      diff: {
        revealedFields: [
          ...(row.account_number_full ? ['account_number_full'] : []),
          ...(row.vault_ref ? ['vault_ref'] : [])
        ]
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'beneficiary_payment_profile',
        aggregateId: profile.profileId,
        eventType: 'finance.beneficiary_payment_profile.revealed_sensitive',
        payload: {
          profileId: profile.profileId,
          actorUserId: input.actorUserId,
          reason: input.reason.trim(),
          revealedFields: [
            ...(row.account_number_full ? ['account_number_full'] : []),
            ...(row.vault_ref ? ['vault_ref'] : [])
          ]
        }
      },
      c
    )

    return { profile, auditId, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
