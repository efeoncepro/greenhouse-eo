// TASK-749 — Beneficiary Payment Profiles domain types.
// Spec: docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.

export const BENEFICIARY_PAYMENT_PROFILE_BENEFICIARY_TYPES = [
  'member',
  'shareholder',
  'supplier',
  'tax_authority',
  'processor',
  'other'
] as const

export type BeneficiaryPaymentProfileBeneficiaryType =
  (typeof BENEFICIARY_PAYMENT_PROFILE_BENEFICIARY_TYPES)[number]

export const BENEFICIARY_PAYMENT_PROFILE_STATUSES = [
  'draft',
  'pending_approval',
  'active',
  'superseded',
  'cancelled'
] as const

export type BeneficiaryPaymentProfileStatus =
  (typeof BENEFICIARY_PAYMENT_PROFILE_STATUSES)[number]

export const BENEFICIARY_PAYMENT_PROFILE_PAYMENT_METHODS = [
  'bank_transfer',
  'wire',
  'paypal',
  'wise',
  'deel',
  'global66',
  'manual_cash',
  'check',
  'sii_pec',
  'other'
] as const

export type BeneficiaryPaymentProfilePaymentMethod =
  (typeof BENEFICIARY_PAYMENT_PROFILE_PAYMENT_METHODS)[number]

export type BeneficiaryPaymentProfileCurrency = 'CLP' | 'USD'

export const BENEFICIARY_PAYMENT_PROFILE_AUDIT_ACTIONS = [
  'created',
  'updated',
  'approved',
  'superseded',
  'cancelled',
  'revealed_sensitive'
] as const

export type BeneficiaryPaymentProfileAuditAction =
  (typeof BENEFICIARY_PAYMENT_PROFILE_AUDIT_ACTIONS)[number]

/**
 * Payment profile en su forma "safe": campos sensibles enmascarados.
 * Nunca expone account_number_full ni vault_ref completo a menos que
 * el caller pase por reveal-sensitive con capability.
 */
export interface BeneficiaryPaymentProfileSafe {
  profileId: string
  spaceId: string | null
  beneficiaryType: BeneficiaryPaymentProfileBeneficiaryType
  beneficiaryId: string
  beneficiaryName: string | null
  countryCode: string | null
  currency: BeneficiaryPaymentProfileCurrency
  providerSlug: string | null
  paymentMethod: BeneficiaryPaymentProfilePaymentMethod | null
  paymentInstrumentId: string | null
  accountHolderName: string | null
  accountNumberMasked: string | null
  bankName: string | null
  routingReference: string | null
  hasFullAccountNumber: boolean
  hasVaultRef: boolean
  status: BeneficiaryPaymentProfileStatus
  activeFrom: string | null
  activeTo: string | null
  supersededBy: string | null
  requireApproval: boolean
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  cancelledBy: string | null
  cancelledReason: string | null
  cancelledAt: string | null
  notes: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Variante con datos sensibles revelados. Solo se construye en
 * endpoints que pasaron por capability `finance.payment_profiles.reveal_sensitive`
 * + audit log.
 */
export interface BeneficiaryPaymentProfileWithSensitive extends BeneficiaryPaymentProfileSafe {
  accountNumberFull: string | null
  vaultRef: string | null
  revealedAt: string
  revealedBy: string
}

export interface BeneficiaryPaymentProfileAuditEntry {
  auditId: string
  profileId: string
  action: BeneficiaryPaymentProfileAuditAction
  actorUserId: string
  actorEmail: string | null
  reason: string | null
  diffJson: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
