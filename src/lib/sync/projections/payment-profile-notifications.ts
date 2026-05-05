import 'server-only'

import type { PaymentProfileEmailKind } from '@/emails/BeneficiaryPaymentProfileChangedEmail'
import { notifyBeneficiaryOfPaymentProfileChange } from '@/lib/finance/beneficiary-payment-profiles/notify-beneficiary'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-753 — Reactive projection que consume los 4 eventos canonicos del
 * lifecycle de `beneficiary_payment_profiles` y notifica al beneficiario
 * por email cuando aplica (V1 solo `beneficiary_type='member'`).
 *
 * Eventos:
 *   - finance.beneficiary_payment_profile.created    → kind='created'
 *   - finance.beneficiary_payment_profile.approved   → kind='approved'
 *   - finance.beneficiary_payment_profile.superseded → kind='superseded'
 *   - finance.beneficiary_payment_profile.cancelled  → kind='cancelled'
 *
 * Frontera:
 *   - El email NO contiene `account_number_full` (TASK-749 contract).
 *   - Beneficiarios no-member (shareholder, supplier, ...) son skip
 *     silentioso (status='skipped_non_member').
 *   - Idempotencia: `notifyBeneficiaryOfPaymentProfileChange` recibe
 *     `sourceEventId` y la capa de email engine puede deduplicar por
 *     evento. La projection rethrowa solo en errores no esperados para
 *     que el reactive consumer aplique retry backoff.
 */

const TRIGGER_EVENTS = [
  EVENT_TYPES.financeBeneficiaryPaymentProfileCreated,
  EVENT_TYPES.financeBeneficiaryPaymentProfileApproved,
  EVENT_TYPES.financeBeneficiaryPaymentProfileSuperseded,
  EVENT_TYPES.financeBeneficiaryPaymentProfileCancelled
] as const

const eventTypeToKind = (eventType: string): PaymentProfileEmailKind | null => {
  if (eventType === EVENT_TYPES.financeBeneficiaryPaymentProfileCreated) return 'created'
  if (eventType === EVENT_TYPES.financeBeneficiaryPaymentProfileApproved) return 'approved'
  if (eventType === EVENT_TYPES.financeBeneficiaryPaymentProfileSuperseded) return 'superseded'
  if (eventType === EVENT_TYPES.financeBeneficiaryPaymentProfileCancelled) return 'cancelled'

  return null
}

const extractProfileId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.profileId, payload.profile_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

export const paymentProfileNotificationsProjection: ProjectionDefinition = {
  name: 'payment_profile_notifications',
  description:
    'TASK-753: notifica al beneficiario por email cuando su perfil de pago cambia (created/approved/superseded/cancelled). Solo beneficiary_type=member en V1. Datos siempre enmascarados.',
  domain: 'finance',
  triggerEvents: [...TRIGGER_EVENTS],

  extractScope: payload => {
    const profileId = extractProfileId(payload)

    if (!profileId) return null

    return { entityType: 'beneficiary_payment_profile', entityId: profileId }
  },

  refresh: async (scope, payload) => {
    const eventType =
      typeof payload._eventType === 'string'
        ? payload._eventType
        : typeof payload.eventType === 'string'
          ? payload.eventType
          : null

    const sourceEventId =
      typeof payload._eventId === 'string'
        ? payload._eventId
        : typeof payload.eventId === 'string'
          ? payload.eventId
          : null

    const kind = eventType ? eventTypeToKind(eventType) : null

    if (!kind) {
      return `payment_profile_notifications ${scope.entityId}: skipped (unknown event ${eventType ?? '<unset>'})`
    }

    const result = await notifyBeneficiaryOfPaymentProfileChange({
      profileId: scope.entityId,
      kind,
      sourceEventId
    })

    if (result.status === 'failed') {
      throw new Error(`payment_profile_notifications ${scope.entityId} (${kind}): ${result.error ?? 'unknown'}`)
    }

    return `payment_profile_notifications ${scope.entityId} (${kind}): ${result.status}`
  },

  maxRetries: 3
}
