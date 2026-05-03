import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfilePaymentMethod,
  BeneficiaryPaymentProfileSafe
} from '@/types/payment-profiles'

import { writeProfileAuditEntry } from './audit'
import { PaymentProfileValidationError } from './errors'
import { maskSensitiveValue } from './mask'
import { mapProfileRowSafe, type ProfileRow } from './row-mapper'

export interface CreatePaymentProfileInput {
  spaceId?: string | null
  beneficiaryType: BeneficiaryPaymentProfileBeneficiaryType
  beneficiaryId: string
  beneficiaryName?: string | null
  countryCode?: string | null
  currency: BeneficiaryPaymentProfileCurrency
  providerSlug?: string | null
  paymentMethod?: BeneficiaryPaymentProfilePaymentMethod | null
  paymentInstrumentId?: string | null
  accountHolderName?: string | null
  accountNumberFull?: string | null
  bankName?: string | null
  routingReference?: string | null
  vaultRef?: string | null
  notes?: string | null
  requireApproval?: boolean
  createdBy: string
  metadata?: Record<string, unknown>
}

const buildProfileId = () => `bpp-${randomUUID()}`

const validateInput = (input: CreatePaymentProfileInput): void => {
  if (!input.createdBy) throw new PaymentProfileValidationError('createdBy es requerido')
  if (!input.beneficiaryId) throw new PaymentProfileValidationError('beneficiaryId es requerido')

  if (!input.currency || (input.currency !== 'CLP' && input.currency !== 'USD')) {
    throw new PaymentProfileValidationError(`currency invalida: ${input.currency}`)
  }

  // V1: enforce beneficiary_type ∈ member|shareholder. Otros types se
  // aceptan en el CHECK constraint para forward compat pero no son
  // creables via este helper en V1.
  if (input.beneficiaryType !== 'member' && input.beneficiaryType !== 'shareholder') {
    throw new PaymentProfileValidationError(
      `V1 solo soporta beneficiary_type member|shareholder. Recibido: ${input.beneficiaryType}`,
      'beneficiary_type_unsupported_v1'
    )
  }

  if (input.providerSlug && !/^[a-z0-9_-]+$/i.test(input.providerSlug)) {
    throw new PaymentProfileValidationError(`provider_slug invalido: ${input.providerSlug}`)
  }
}

/**
 * Crea un perfil de pago en estado `draft` o `pending_approval` segun
 * `requireApproval`. Para que el perfil quede `active` se necesita un
 * llamado posterior a `approvePaymentProfile` por un usuario distinto
 * al maker (cuando require_approval=TRUE).
 *
 * Si ya existe un perfil `active` para (space, beneficiary, currency),
 * el nuevo entra como `pending_approval` y al aprobarse el helper
 * `approvePaymentProfile` automaticamente supersede el viejo (mediante
 * el unique partial index + transition).
 */
export async function createPaymentProfile(
  input: CreatePaymentProfileInput,
  client?: PoolClient
): Promise<{ profile: BeneficiaryPaymentProfileSafe; eventId: string }> {
  validateInput(input)

  const run = async (c: PoolClient) => {
    const profileId = buildProfileId()
    const requireApproval = input.requireApproval !== false
    const initialStatus = requireApproval ? 'pending_approval' : 'draft'

    const accountNumberMasked = maskSensitiveValue(input.accountNumberFull)

    const inserted = await c.query<ProfileRow>(
      `INSERT INTO greenhouse_finance.beneficiary_payment_profiles (
         profile_id, space_id,
         beneficiary_type, beneficiary_id, beneficiary_name,
         country_code, currency,
         provider_slug, payment_method, payment_instrument_id,
         account_holder_name, account_number_masked, account_number_full,
         bank_name, routing_reference, vault_ref,
         status, require_approval, created_by, notes,
         metadata_json
       )
       VALUES ($1, $2,
               $3, $4, $5,
               $6, $7,
               $8, $9, $10,
               $11, $12, $13,
               $14, $15, $16,
               $17, $18, $19, $20,
               $21::jsonb)
       RETURNING *`,
      [
        profileId,
        input.spaceId ?? null,
        input.beneficiaryType,
        input.beneficiaryId,
        input.beneficiaryName ?? null,
        input.countryCode ?? null,
        input.currency,
        input.providerSlug ?? null,
        input.paymentMethod ?? null,
        input.paymentInstrumentId ?? null,
        input.accountHolderName ?? null,
        accountNumberMasked,
        input.accountNumberFull ?? null,
        input.bankName ?? null,
        input.routingReference ?? null,
        input.vaultRef ?? null,
        initialStatus,
        requireApproval,
        input.createdBy,
        input.notes ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    const profile = mapProfileRowSafe(inserted.rows[0])

    await writeProfileAuditEntry(c, {
      profileId: profile.profileId,
      action: 'created',
      actorUserId: input.createdBy,
      diff: {
        beneficiaryType: profile.beneficiaryType,
        beneficiaryId: profile.beneficiaryId,
        currency: profile.currency,
        providerSlug: profile.providerSlug,
        paymentMethod: profile.paymentMethod,
        hasFullAccountNumber: profile.hasFullAccountNumber,
        hasVaultRef: profile.hasVaultRef,
        status: profile.status,
        requireApproval: profile.requireApproval
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'beneficiary_payment_profile',
        aggregateId: profile.profileId,
        eventType: 'finance.beneficiary_payment_profile.created',
        payload: {
          profileId: profile.profileId,
          spaceId: profile.spaceId,
          beneficiaryType: profile.beneficiaryType,
          beneficiaryId: profile.beneficiaryId,
          currency: profile.currency,
          providerSlug: profile.providerSlug,
          paymentMethod: profile.paymentMethod,
          status: profile.status,
          requireApproval: profile.requireApproval
        }
      },
      c
    )

    return { profile, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
