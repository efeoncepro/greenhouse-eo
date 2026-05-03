import type {
  BeneficiaryPaymentProfileAuditAction,
  BeneficiaryPaymentProfileAuditEntry,
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfilePaymentMethod,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus,
  BeneficiaryPaymentProfileWithSensitive
} from '@/types/payment-profiles'

import { maskSensitiveValue } from './mask'

export interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  space_id: string | null
  beneficiary_type: string
  beneficiary_id: string
  beneficiary_name: string | null
  country_code: string | null
  currency: string
  provider_slug: string | null
  payment_method: string | null
  payment_instrument_id: string | null
  account_holder_name: string | null
  account_number_masked: string | null
  account_number_full: string | null
  bank_name: string | null
  routing_reference: string | null
  vault_ref: string | null
  status: string
  active_from: string | null
  active_to: string | null
  superseded_by: string | null
  require_approval: boolean
  created_by: string
  approved_by: string | null
  approved_at: string | null
  cancelled_by: string | null
  cancelled_reason: string | null
  cancelled_at: string | null
  notes: string | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProfileAuditRow extends Record<string, unknown> {
  audit_id: string
  profile_id: string
  action: string
  actor_user_id: string
  actor_email: string | null
  reason: string | null
  diff_json: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return new Date().toISOString()
}

export const mapProfileRowSafe = (row: ProfileRow): BeneficiaryPaymentProfileSafe => ({
  profileId: row.profile_id,
  spaceId: row.space_id,
  beneficiaryType: row.beneficiary_type as BeneficiaryPaymentProfileBeneficiaryType,
  beneficiaryId: row.beneficiary_id,
  beneficiaryName: row.beneficiary_name,
  countryCode: row.country_code,
  currency: row.currency as BeneficiaryPaymentProfileCurrency,
  providerSlug: row.provider_slug,
  paymentMethod: (row.payment_method as BeneficiaryPaymentProfilePaymentMethod | null) ?? null,
  paymentInstrumentId: row.payment_instrument_id,
  accountHolderName: row.account_holder_name,
  accountNumberMasked:
    row.account_number_masked ?? maskSensitiveValue(row.account_number_full),
  bankName: row.bank_name,
  routingReference: row.routing_reference,
  hasFullAccountNumber: Boolean(row.account_number_full),
  hasVaultRef: Boolean(row.vault_ref),
  status: row.status as BeneficiaryPaymentProfileStatus,
  activeFrom: row.active_from,
  activeTo: row.active_to,
  supersededBy: row.superseded_by,
  requireApproval: row.require_approval,
  createdBy: row.created_by,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  cancelledBy: row.cancelled_by,
  cancelledReason: row.cancelled_reason,
  cancelledAt: row.cancelled_at,
  notes: row.notes,
  metadataJson: row.metadata_json ?? {},
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
})

export const mapProfileRowWithSensitive = (
  row: ProfileRow,
  revealedBy: string
): BeneficiaryPaymentProfileWithSensitive => ({
  ...mapProfileRowSafe(row),
  accountNumberFull: row.account_number_full,
  vaultRef: row.vault_ref,
  revealedAt: new Date().toISOString(),
  revealedBy
})

export const mapAuditRow = (row: ProfileAuditRow): BeneficiaryPaymentProfileAuditEntry => ({
  auditId: row.audit_id,
  profileId: row.profile_id,
  action: row.action as BeneficiaryPaymentProfileAuditAction,
  actorUserId: row.actor_user_id,
  actorEmail: row.actor_email,
  reason: row.reason,
  diffJson: row.diff_json ?? {},
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: toIso(row.created_at)
})
