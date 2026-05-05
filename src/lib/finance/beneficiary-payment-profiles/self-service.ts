import 'server-only'

import { query } from '@/lib/db'

import { cancelPaymentProfile } from './cancel-profile'
import { createPaymentProfile, type CreatePaymentProfileInput } from './create-profile'
import { PaymentProfileConflictError, PaymentProfileValidationError } from './errors'
import { listPaymentProfiles } from './list-profiles'
import type { BeneficiaryPaymentProfileSafe } from '@/types/payment-profiles'

/**
 * TASK-753 — Wrappers de self-service sobre el modulo canonico
 * `beneficiary-payment-profiles` (TASK-749). Reglas duras:
 *
 *  1. El colaborador SOLO opera sobre perfiles cuyo `beneficiary_id`
 *     coincide con su `memberId` de session. Cualquier otra cosa es 403.
 *  2. Crear = `pending_approval` con `metadata_json.requested_by='member'`.
 *     Finance aprueba con maker-checker (guard ya enforced en TS+DB).
 *  3. Cancelar self-service solo permitido sobre perfiles `pending_approval`
 *     creados por el propio colaborador. NO sobre `active` ajenos ni sobre
 *     pending creados por finance (eso seria sabotear maker-checker).
 *  4. La fuente de verdad sigue siendo el modulo TASK-749. Estos wrappers
 *     SOLO inyectan defensas de scope + flag `requested_by`.
 */

export interface ListSelfServicePaymentProfilesInput {
  memberId: string
}

/**
 * Lista perfiles de pago del colaborador (siempre masked via list-profiles).
 * Retorna draft/pending_approval/active. NO incluye superseded/cancelled —
 * el colaborador no necesita ver historico operacional, solo el activo y el
 * pending en revision (si aplica).
 */
export const listSelfServicePaymentProfiles = async (
  input: ListSelfServicePaymentProfilesInput
): Promise<BeneficiaryPaymentProfileSafe[]> => {
  const { items } = await listPaymentProfiles({
    beneficiaryType: 'member',
    beneficiaryId: input.memberId,
    limit: 50
  })

  return items.filter(p => p.status === 'draft' || p.status === 'pending_approval' || p.status === 'active')
}

export interface CreateSelfServiceProfileRequestInput {
  memberId: string
  /** Session user id — para `created_by`. NUNCA puede aprobar despues. */
  userId: string
  spaceId?: string | null
  currency: 'CLP' | 'USD'
  beneficiaryName?: string | null
  countryCode?: string | null
  providerSlug?: string | null
  paymentMethod?: CreatePaymentProfileInput['paymentMethod']
  accountHolderName?: string | null
  accountNumberFull?: string | null
  bankName?: string | null
  routingReference?: string | null
  notes?: string | null
}

export interface CreateSelfServiceProfileRequestResult {
  profile: BeneficiaryPaymentProfileSafe
  eventId: string
}

/**
 * Self-service: el colaborador solicita un cambio de su perfil de pago.
 * SIEMPRE entra como `pending_approval` (require_approval=true). El flag
 * `metadata_json.requested_by='member'` permite a la cola ops mostrar
 * "Solicitado por colaborador".
 */
export const createSelfServicePaymentProfileRequest = async (
  input: CreateSelfServiceProfileRequestInput
): Promise<CreateSelfServiceProfileRequestResult> => {
  if (!input.memberId) {
    throw new PaymentProfileValidationError('memberId es requerido')
  }

  if (!input.userId) {
    throw new PaymentProfileValidationError('userId es requerido')
  }

  return createPaymentProfile({
    spaceId: input.spaceId ?? null,
    beneficiaryType: 'member',
    beneficiaryId: input.memberId,
    beneficiaryName: input.beneficiaryName ?? null,
    countryCode: input.countryCode ?? null,
    currency: input.currency,
    providerSlug: input.providerSlug ?? null,
    paymentMethod: input.paymentMethod ?? null,
    accountHolderName: input.accountHolderName ?? null,
    accountNumberFull: input.accountNumberFull ?? null,
    bankName: input.bankName ?? null,
    routingReference: input.routingReference ?? null,
    notes: input.notes ?? null,
    requireApproval: true,
    createdBy: input.userId,
    metadata: {
      requested_by: 'member',
      requested_at: new Date().toISOString(),
      source: 'my_payment_profile_self_service'
    }
  })
}

export interface CancelSelfServiceProfileInput {
  profileId: string
  memberId: string
  userId: string
  reason: string
}

interface ProfileOwnershipRow {
  beneficiary_id: string
  beneficiary_type: string
  status: string
  created_by: string | null
  metadata_json: Record<string, unknown> | null
  [key: string]: unknown
}

/**
 * Self-service: el colaborador cancela su propia solicitud (perfil
 * pending_approval que el mismo creo). NO permite cancelar profiles activos
 * ni pendings creados por otra persona (eso debe pasar por finance ops).
 */
export const cancelSelfServicePaymentProfile = async (
  input: CancelSelfServiceProfileInput
) => {
  if (input.reason.trim().length < 3) {
    throw new PaymentProfileValidationError('Razon de cancelacion requerida (min 3 chars)')
  }

  const rows = await query<ProfileOwnershipRow>(
    `SELECT beneficiary_id, beneficiary_type, status, created_by, metadata_json
       FROM greenhouse_finance.beneficiary_payment_profiles
      WHERE profile_id = $1
      LIMIT 1`,
    [input.profileId]
  )

  const row = rows[0]

  if (!row) {
    throw new PaymentProfileValidationError('Profile no existe', 'profile_not_found')
  }

  if (row.beneficiary_type !== 'member' || row.beneficiary_id !== input.memberId) {
    throw new PaymentProfileConflictError(
      'No es tu perfil de pago',
      'self_service_not_owner',
      403
    )
  }

  if (row.status !== 'pending_approval' && row.status !== 'draft') {
    throw new PaymentProfileConflictError(
      `Solo se puede cancelar self-service una solicitud pendiente. Estado actual: ${row.status}`,
      'self_service_invalid_status',
      409
    )
  }

  if (row.created_by && row.created_by !== input.userId) {
    throw new PaymentProfileConflictError(
      'Solo quien creo la solicitud puede cancelarla self-service',
      'self_service_not_creator',
      403
    )
  }

  return cancelPaymentProfile({
    profileId: input.profileId,
    cancelledBy: input.userId,
    reason: input.reason.trim()
  })
}
