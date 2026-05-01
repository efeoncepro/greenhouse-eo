import 'server-only'

import { getActivePaymentProfile } from '@/lib/finance/beneficiary-payment-profiles/list-profiles'
import type { PaymentObligation } from '@/types/payment-obligations'
import type {
  BeneficiaryPaymentProfilePaymentMethod,
  BeneficiaryPaymentProfileSafe
} from '@/types/payment-profiles'

export type PaymentRouteOutcome =
  | 'resolved'
  | 'profile_missing'
  | 'profile_pending_approval'
  | 'unsupported_currency'
  | 'unsupported_beneficiary_type'

export interface PaymentRouteContext {
  /**
   * Hints opcionales que el caller puede entregar cuando los conoce.
   * Si ausentes, se intenta resolver desde la obligation/profile.
   */
  payRegime?: 'chile' | 'international' | null
  payrollVia?: 'internal' | 'deel' | null
  memberCountryCode?: string | null
}

export interface PaymentRouteSnapshot {
  outcome: PaymentRouteOutcome
  reason: string
  // Cuando outcome=resolved
  providerSlug: string | null
  paymentMethod: BeneficiaryPaymentProfilePaymentMethod | null
  paymentInstrumentId: string | null
  profileId: string | null
  profileVersion: number
  profileBeneficiaryType: string | null
  countryCode: string | null
  resolvedAt: string
}

const supportedBeneficiaryTypes = new Set(['member', 'shareholder'])

/**
 * Resuelve la ruta de pago canonica para una obligation, consultando el
 * perfil activo del beneficiario y aplicando policy en cascada.
 *
 * Cascada:
 *   1. Si beneficiary_type !∈ {member, shareholder} → unsupported (V1).
 *   2. Buscar profile `active` por (space, beneficiary_type, beneficiary_id, currency).
 *   3. Si no hay activo pero hay `pending_approval` → profile_pending_approval.
 *   4. Si no hay ningun perfil → profile_missing (caller debe crear uno).
 *   5. Si hay activo: tomar provider_slug + payment_method + payment_instrument_id
 *      del profile como ruta canonica. profileVersion=1 (V1, sin
 *      versionado fino aun — patch en V2).
 *
 * Output siempre tiene `resolvedAt` y `outcome`. La UI usa outcome para
 * decidir si bloquear o permitir el siguiente paso.
 */
export async function resolvePaymentRoute(
  obligation: Pick<
    PaymentObligation,
    'spaceId' | 'beneficiaryType' | 'beneficiaryId' | 'currency' | 'obligationKind'
  >,
  context: PaymentRouteContext = {}
): Promise<PaymentRouteSnapshot> {
  const resolvedAt = new Date().toISOString()

  if (!supportedBeneficiaryTypes.has(obligation.beneficiaryType)) {
    return {
      outcome: 'unsupported_beneficiary_type',
      reason: `V1 solo soporta routing automatico para member/shareholder. Recibido: ${obligation.beneficiaryType}. Caller debe entregar processorSlug + paymentMethod manualmente.`,
      providerSlug: null,
      paymentMethod: null,
      paymentInstrumentId: null,
      profileId: null,
      profileVersion: 0,
      profileBeneficiaryType: null,
      countryCode: null,
      resolvedAt
    }
  }

  if (obligation.currency !== 'CLP' && obligation.currency !== 'USD') {
    return {
      outcome: 'unsupported_currency',
      reason: `Currency invalida: ${obligation.currency}`,
      providerSlug: null,
      paymentMethod: null,
      paymentInstrumentId: null,
      profileId: null,
      profileVersion: 0,
      profileBeneficiaryType: null,
      countryCode: null,
      resolvedAt
    }
  }

  const activeProfile = await getActivePaymentProfile({
    spaceId: obligation.spaceId,
    beneficiaryType: obligation.beneficiaryType,
    beneficiaryId: obligation.beneficiaryId,
    currency: obligation.currency
  })

  if (activeProfile) {
    return buildResolvedSnapshot(activeProfile, resolvedAt, context)
  }

  // No hay activo: chequear si hay pending para dar mensaje util
  const { listPaymentProfiles } = await import(
    '@/lib/finance/beneficiary-payment-profiles/list-profiles'
  )

  const pending = await listPaymentProfiles({
    spaceId: obligation.spaceId ?? undefined,
    beneficiaryType: obligation.beneficiaryType as 'member' | 'shareholder',
    beneficiaryId: obligation.beneficiaryId,
    currency: obligation.currency,
    status: 'pending_approval',
    limit: 1
  })

  if (pending.items.length > 0) {
    return {
      outcome: 'profile_pending_approval',
      reason: `Existe perfil ${pending.items[0].profileId} en pending_approval. Aprobar antes de crear orden.`,
      providerSlug: pending.items[0].providerSlug,
      paymentMethod: pending.items[0].paymentMethod,
      paymentInstrumentId: pending.items[0].paymentInstrumentId,
      profileId: pending.items[0].profileId,
      profileVersion: 0,
      profileBeneficiaryType: pending.items[0].beneficiaryType,
      countryCode: pending.items[0].countryCode,
      resolvedAt
    }
  }

  return {
    outcome: 'profile_missing',
    reason: `No hay perfil de pago para ${obligation.beneficiaryType}:${obligation.beneficiaryId} en ${obligation.currency}. Crear uno antes de generar la orden.`,
    providerSlug: null,
    paymentMethod: null,
    paymentInstrumentId: null,
    profileId: null,
    profileVersion: 0,
    profileBeneficiaryType: null,
    countryCode: null,
    resolvedAt
  }
}

const buildResolvedSnapshot = (
  profile: BeneficiaryPaymentProfileSafe,
  resolvedAt: string,
  context: PaymentRouteContext
): PaymentRouteSnapshot => ({
  outcome: 'resolved',
  reason: buildReason(profile, context),
  providerSlug: profile.providerSlug,
  paymentMethod: profile.paymentMethod,
  paymentInstrumentId: profile.paymentInstrumentId,
  profileId: profile.profileId,
  profileVersion: 1,
  profileBeneficiaryType: profile.beneficiaryType,
  countryCode: profile.countryCode,
  resolvedAt
})

const buildReason = (
  profile: BeneficiaryPaymentProfileSafe,
  context: PaymentRouteContext
): string => {
  const parts: string[] = [`profile=${profile.profileId}`]

  if (profile.providerSlug) parts.push(`provider=${profile.providerSlug}`)
  if (profile.paymentMethod) parts.push(`method=${profile.paymentMethod}`)
  if (context.payRegime) parts.push(`pay_regime=${context.payRegime}`)
  if (context.payrollVia) parts.push(`payroll_via=${context.payrollVia}`)

  return parts.join(' · ')
}
