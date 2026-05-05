/**
 * TASK-784 redesign — DTO + view-model types compartidos por los subcomponentes
 * de LegalProfileTab.
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

export interface LegalProfileResponseDto {
  profileId: string
  documents: DocumentDto[]
  addresses: AddressDto[]
  readiness: {
    payrollChileDependent: ReadinessResultDto
    finalSettlementChile: ReadinessResultDto
  }
}

export type ItemAccent = 'success' | 'warning' | 'error' | 'neutral'

export const accentForStatus = (status: LegalDocumentStatus): ItemAccent => {
  if (status === 'verified') return 'success'
  if (status === 'pending_review') return 'warning'
  if (status === 'rejected') return 'error'

  return 'neutral'
}
