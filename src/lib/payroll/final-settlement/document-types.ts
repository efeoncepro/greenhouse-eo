import type {
  FinalSettlement,
  FinalSettlementBreakdownLine,
  FinalSettlementExplanation,
  FinalSettlementReadiness,
  FinalSettlementSourceSnapshot
} from './types'

export const FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE = 'cl_final_settlement_resignation_v1' as const
// TASK-862 Slice C — bump version porque el snapshot shape gano 4 campos opcionales
// (collaborator.address*, employer.logoAssetId, top-level maintenanceObligation,
// resignationLetterAssetId, ratification). Backwards-compat: documentos rendered
// pre-2026-05-11 quedan en snapshot v1 (sin esos campos); el PDF renderer (Slice D)
// los lee con fallback null sin romper.
export const FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION = '2026-05-11.v2' as const

/**
 * TASK-862 — Maintenance obligation (Ley 21.389 / Ley 14.908 mod. 2021).
 * Persistido en greenhouse_hr.work_relationship_offboarding_cases.maintenance_obligation_json.
 * Validacion runtime en endpoint POST /maintenance-obligation; el snapshot solo lee.
 *
 * Alt A (not_subject): trabajador NO afecto a retencion. Sin amount/beneficiary.
 * Alt B (subject): trabajador SI afecto. amount + beneficiary obligatorios; evidence opcional.
 */
export interface FinalSettlementMaintenanceObligation {
  variant: 'not_subject' | 'subject'
  amount?: number
  beneficiary?: string
  evidenceAssetId?: string
  declaredAt: string
  declaredByUserId: string
}

/**
 * TASK-862 — Ratification metadata, extraida del signature_evidence_ref + signed_or_ratified_at
 * cuando documentStatus=signed_or_ratified. Null en otros estados.
 */
export interface FinalSettlementRatification {
  ministerKind: 'notary' | 'labor_inspector' | 'union_president' | 'civil_registry'
  ministerName: string
  ministerTaxId: string
  notaria: string | null
  ratifiedAt: string
}

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
    // TASK-862 Slice C — domicilio del trabajador (TASK-784 person_addresses).
    // Resuelto desde greenhouse_core.person_addresses con address_type='residence'
    // y verification_status='verified'. Null si no existe / no verified.
    addressLine1?: string | null
    city?: string | null
    region?: string | null
    addressPresentation?: string | null
  }
  employer: {
    organizationId: string
    legalName: string
    taxId: string | null
    taxIdType: string | null
    legalAddress: string | null
    country: string
    source: 'settlement_legal_entity' | 'operating_entity_fallback'
    // TASK-862 Slice C — logo del empleador (assets FK). Fallback a logo Greenhouse
    // hardcoded en document-pdf.tsx cuando null.
    logoAssetId?: string | null
  }
  sourceSnapshot: FinalSettlementSourceSnapshot
  breakdown: FinalSettlementBreakdownLine[]
  explanation: FinalSettlementExplanation
  readiness: FinalSettlementReadiness
  documentReadiness?: FinalSettlementDocumentReadiness
  // TASK-862 Slice C — declaracion Ley 21.389 pension de alimentos. Null bloquea
  // emision (readiness check maintenance_obligation_declared).
  maintenanceObligation?: FinalSettlementMaintenanceObligation | null
  // TASK-862 Slice C — carta de renuncia ratificada (assets FK). Null bloquea
  // calculo (readiness check resignation_letter_uploaded).
  resignationLetterAssetId?: string | null
  // TASK-862 Slice C — metadata ratificacion notarial; poblada solo cuando
  // documentStatus=signed_or_ratified. PDF renderer remueve watermark "PROYECTO"
  // y popula la columna del ministro de fe.
  ratification?: FinalSettlementRatification | null
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
