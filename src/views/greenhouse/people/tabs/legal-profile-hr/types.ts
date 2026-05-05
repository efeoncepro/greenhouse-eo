/**
 * TASK-784 HR redesign — DTOs for /people/[slug] HR view.
 * Mirror of /api/hr/people/[memberId]/legal-profile response shape.
 */

export type LegalDocumentStatus =
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'archived'
  | 'expired'

export interface DocumentDto {
  documentId: string
  countryCode: string
  documentType: string
  displayMask: string
  verificationStatus: LegalDocumentStatus
  source: string
  declaredAt: string
  verifiedAt: string | null
  rejectedReason: string | null
}

export interface AddressDto {
  addressId: string
  addressType: 'legal' | 'residence' | 'mailing' | 'emergency'
  countryCode: string
  presentationMask: string
  city: string
  region: string | null
  verificationStatus: LegalDocumentStatus
  source: string
  declaredAt: string
  verifiedAt: string | null
  rejectedReason: string | null
}

export interface ReadinessResultDto {
  ready: boolean
  blockers: string[]
  warnings: string[]
}

export interface HrLegalProfileResponseDto {
  memberId: string
  profileId: string
  documents: DocumentDto[]
  addresses: AddressDto[]
  readiness: {
    finalSettlementChile: ReadinessResultDto
    payrollChileDependent: ReadinessResultDto
  }
  capabilities: {
    canVerify: boolean
    canHrUpdate: boolean
    canRevealSensitive: boolean
  }
}

export interface AuditEventDto {
  auditId: string
  targetKind: 'document' | 'address'
  targetId: string
  action: string
  actorUserId: string | null
  actorEmail: string | null
  reason: string | null
  diffJson: Record<string, unknown>
  createdAt: string
}

export type ItemAccent = 'success' | 'warning' | 'error' | 'neutral'

export const accentForStatus = (status: LegalDocumentStatus): ItemAccent => {
  if (status === 'verified') return 'success'
  if (status === 'pending_review') return 'warning'
  if (status === 'rejected') return 'error'

  return 'neutral'
}

export type SectionMode = 'view' | 'edit-document' | 'edit-address'

export interface EditAddressTarget {
  addressType: 'legal' | 'residence' | 'mailing' | 'emergency'
  initialCountry?: string
  existingAddressId?: string
}

export interface EditDocumentTarget {
  initialCountry?: string
  initialType?: string
  existingDocumentId?: string
}

export type ActiveEdit =
  | { kind: 'document'; target: EditDocumentTarget }
  | { kind: 'address'; target: EditAddressTarget }
  | null
