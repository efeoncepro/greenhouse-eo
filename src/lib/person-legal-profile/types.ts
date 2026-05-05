import 'server-only'

/**
 * TASK-784 — Types canonicos del modulo person-legal-profile.
 *
 * Convenciones:
 *   - `*Masked` types NUNCA incluyen `value_full` ni `presentation_text`.
 *   - `*Sensitive` types incluyen el valor revelado y solo se devuelven a
 *     callers que pasaron capability + reason (TASK-697 pattern).
 *   - `*Snapshot` types se pasan a generadores de documentos formales
 *     (final_settlement, payroll_receipt) y se logean como
 *     `action='export_snapshot'` en el audit log.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Document types (extensible per country)
// ──────────────────────────────────────────────────────────────────────────────

export const PERSON_DOCUMENT_TYPES = [
  'CL_RUT',
  'CL_PASSPORT',
  'CL_DNE',
  'AR_DNI',
  'AR_CUIL',
  'AR_CUIT',
  'BR_CPF',
  'BR_RG',
  'CO_CC',
  'CO_CE',
  'CO_NIT',
  'MX_CURP',
  'MX_RFC',
  'PE_DNI',
  'PE_CE',
  'UY_CI',
  'US_SSN',
  'US_PASSPORT',
  'US_EIN',
  'EU_PASSPORT',
  'EU_NATIONAL_ID',
  'GENERIC_PASSPORT',
  'GENERIC_NATIONAL_ID',
  'GENERIC_TAX_ID'
] as const

export type PersonDocumentType = (typeof PERSON_DOCUMENT_TYPES)[number]

export const isPersonDocumentType = (value: unknown): value is PersonDocumentType =>
  typeof value === 'string' && (PERSON_DOCUMENT_TYPES as readonly string[]).includes(value)

// ──────────────────────────────────────────────────────────────────────────────
// Verification + source
// ──────────────────────────────────────────────────────────────────────────────

export const VERIFICATION_STATUSES = [
  'pending_review',
  'verified',
  'rejected',
  'archived',
  'expired'
] as const

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const PERSON_LEGAL_SOURCES = [
  'self_declared',
  'hr_declared',
  'legacy_bigquery_member_profile',
  'migration',
  'automated_provider'
] as const

export type PersonLegalSource = (typeof PERSON_LEGAL_SOURCES)[number]

export const ADDRESS_TYPES = ['legal', 'residence', 'mailing', 'emergency'] as const
export type AddressType = (typeof ADDRESS_TYPES)[number]

// ──────────────────────────────────────────────────────────────────────────────
// Document records
// ──────────────────────────────────────────────────────────────────────────────

export interface PersonIdentityDocumentMasked {
  documentId: string
  profileId: string
  countryCode: string
  documentType: PersonDocumentType
  issuingCountry: string | null
  displayMask: string
  verificationStatus: VerificationStatus
  source: PersonLegalSource
  validFrom: string | null
  validUntil: string | null
  evidenceAssetId: string | null
  declaredByUserId: string | null
  declaredAt: string
  verifiedByUserId: string | null
  verifiedAt: string | null
  rejectedReason: string | null
  rejectedAt: string | null
  rejectedByUserId: string | null
  archivedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonIdentityDocumentSensitive extends PersonIdentityDocumentMasked {
  valueFull: string
  valueNormalized: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Address records
// ──────────────────────────────────────────────────────────────────────────────

export interface PersonAddressMasked {
  addressId: string
  profileId: string
  addressType: AddressType
  countryCode: string
  presentationMask: string
  city: string
  region: string | null
  verificationStatus: VerificationStatus
  source: PersonLegalSource
  validFrom: string | null
  validUntil: string | null
  evidenceAssetId: string | null
  declaredByUserId: string | null
  declaredAt: string
  verifiedByUserId: string | null
  verifiedAt: string | null
  rejectedReason: string | null
  rejectedAt: string | null
  rejectedByUserId: string | null
  archivedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PersonAddressSensitive extends PersonAddressMasked {
  streetLine1: string
  streetLine2: string | null
  postalCode: string | null
  presentationText: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Snapshot for document generators (final_settlement, payroll_receipt, etc.)
// ──────────────────────────────────────────────────────────────────────────────

export type DocumentSnapshotUseCase =
  | 'final_settlement'
  | 'payroll_receipt'
  | 'honorarios_closure'
  | 'onboarding_contract'

export interface PersonLegalSnapshot {
  profileId: string
  document: {
    documentType: PersonDocumentType
    countryCode: string
    valueFull: string
    displayMask: string
    verificationStatus: VerificationStatus
    verifiedAt: string | null
  } | null
  address: {
    addressType: AddressType
    countryCode: string
    presentationText: string
    presentationMask: string
    verificationStatus: VerificationStatus
  } | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit log records
// ──────────────────────────────────────────────────────────────────────────────

export type PersonLegalAuditAction =
  | 'declared'
  | 'updated'
  | 'verified'
  | 'rejected'
  | 'archived'
  | 'revealed_sensitive'
  | 'export_snapshot'

export interface PersonLegalAuditEntry {
  auditId: string
  profileId: string
  action: PersonLegalAuditAction
  actorUserId: string | null
  actorEmail: string | null
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  diffJson: Record<string, unknown>
  createdAt: string
}
