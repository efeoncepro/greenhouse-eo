import type {
  FinalSettlement,
  FinalSettlementBreakdownLine,
  FinalSettlementExplanation,
  FinalSettlementReadiness,
  FinalSettlementSourceSnapshot
} from './types'

export const FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE = 'cl_final_settlement_resignation_v1' as const
export const FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION = '2026-05-04.v1' as const

export const FINAL_SETTLEMENT_DOCUMENT_STATUSES = [
  'draft',
  'rendered',
  'in_review',
  'approved',
  'issued',
  'signed_or_ratified',
  'rejected',
  'voided',
  'superseded',
  'cancelled'
] as const

export type FinalSettlementDocumentStatus = (typeof FINAL_SETTLEMENT_DOCUMENT_STATUSES)[number]

export type FinalSettlementDocumentRenderStatus = 'pending' | 'rendered' | 'failed'
export type FinalSettlementDocumentSignatureStatus =
  | 'not_started'
  | 'external_process_pending'
  | 'signed_or_ratified'
  | 'rejected'
  | 'voided'

export interface FinalSettlementDocumentReadiness {
  status: 'ready' | 'needs_review' | 'blocked'
  hasBlockers: boolean
  checks: Array<{
    code: string
    status: 'passed' | 'warning' | 'blocked'
    severity: 'info' | 'warning' | 'blocker'
    message: string
    evidence?: Record<string, unknown>
  }>
}

export interface FinalSettlementDocumentSnapshot {
  schemaVersion: 1
  generatedAt: string
  documentTemplateCode: typeof FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE
  documentTemplateVersion: typeof FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION
  officialReferences: Array<{
    code: string
    label: string
    url: string
    verifiedAt: string
  }>
  finalSettlement: Pick<
    FinalSettlement,
    | 'finalSettlementId'
    | 'offboardingCaseId'
    | 'settlementVersion'
    | 'memberId'
    | 'profileId'
    | 'personLegalEntityRelationshipId'
    | 'legalEntityOrganizationId'
    | 'compensationVersionId'
    | 'effectiveDate'
    | 'lastWorkingDay'
    | 'hireDateSnapshot'
    | 'contractEndDateSnapshot'
    | 'separationType'
    | 'contractTypeSnapshot'
    | 'payRegimeSnapshot'
    | 'payrollViaSnapshot'
    | 'currency'
    | 'grossTotal'
    | 'deductionTotal'
    | 'netPayable'
    | 'approvedAt'
    | 'approvedByUserId'
  >
  collaborator: {
    memberId: string
    profileId: string
    displayName: string | null
    legalName: string | null
    primaryEmail: string | null
    taxId: string | null
    jobTitle: string | null
  }
  employer: {
    organizationId: string
    legalName: string
    taxId: string | null
    taxIdType: string | null
    legalAddress: string | null
    country: string
    source: 'settlement_legal_entity' | 'operating_entity_fallback'
  }
  sourceSnapshot: FinalSettlementSourceSnapshot
  breakdown: FinalSettlementBreakdownLine[]
  explanation: FinalSettlementExplanation
  readiness: FinalSettlementReadiness
}

export interface FinalSettlementDocument {
  finalSettlementDocumentId: string
  offboardingCaseId: string
  finalSettlementId: string
  settlementVersion: number
  documentVersion: number
  supersedesDocumentId: string | null
  memberId: string
  profileId: string
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string
  documentTemplateCode: typeof FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE
  documentTemplateVersion: string
  documentStatus: FinalSettlementDocumentStatus
  renderStatus: FinalSettlementDocumentRenderStatus
  signatureStatus: FinalSettlementDocumentSignatureStatus
  snapshot: FinalSettlementDocumentSnapshot
  snapshotHash: string
  contentHash: string | null
  assetId: string | null
  pdfAssetId: string | null
  approvalSnapshotId: string | null
  readiness: FinalSettlementDocumentReadiness
  renderError: string | null
  reviewRequestedAt: string | null
  reviewRequestedByUserId: string | null
  approvedAt: string | null
  approvedByUserId: string | null
  issuedAt: string | null
  issuedByUserId: string | null
  signatureEvidenceAssetId: string | null
  signatureEvidenceRef: Record<string, unknown>
  signedOrRatifiedAt: string | null
  signedOrRatifiedByUserId: string | null
  workerReservationOfRights: boolean
  workerReservationNotes: string | null
  rejectedByWorkerAt: string | null
  rejectedByWorkerByUserId: string | null
  rejectedByWorkerReason: string | null
  voidedAt: string | null
  voidedByUserId: string | null
  voidReason: string | null
  cancelledAt: string | null
  cancelledByUserId: string | null
  cancelReason: string | null
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface RenderFinalSettlementDocumentInput {
  offboardingCaseId: string
  actorUserId: string
  reissue?: boolean
  reason?: string | null
}
