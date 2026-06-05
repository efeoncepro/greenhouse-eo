// TASK-1019 — Workforce Contracting Studio domain types.
// Pure types + domain error + canonical constants (GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1
// §3 lifecycles, §5.2 AI draft, §6 data model). NOT server-only — safe in client + server.
// The store/commands/AI adapter live in server-only modules.

export type WorkforceContractingCaseKind = 'offer_letter' | 'employment_contract'

// §3.1 — Offer letter lifecycle.
export type OfferCaseStatus =
  | 'draft'
  | 'ai_drafted'
  | 'pending_internal_review'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn'
  | 'converted_to_contract'

// §3.2 — Employment contract lifecycle. NOTE: this enum is the executable source of
// truth (arch doc §6); arch §3.2 `pdf_generated` ≅ `ready_for_signature` here.
export type EmploymentContractCaseStatus =
  | 'intake_pending'
  | 'ai_drafted'
  | 'validation_blocked'
  | 'pending_review'
  | 'legal_review'
  | 'internal_approved'
  | 'ready_for_pdf'
  | 'ready_for_signature'
  | 'sent_for_signature'
  | 'partially_signed'
  | 'fully_signed'
  | 'registered_external'
  | 'active'
  | 'rejected'
  | 'voided'
  | 'expired'
  | 'superseded'
  | 'signature_failed'
  | 'needs_amendment'

export type WorkforceContractingCaseStatus = OfferCaseStatus | EmploymentContractCaseStatus

export type ContractLanguage = 'es-CL' | 'en-US'
export type SignableFormat = 'pdf' | 'docx'
export type SignatureProvider = 'zapsign'

export type WorkforceContractingDraftSource = 'manual' | 'claude_ai' | 'imported'
export type WorkforceContractingDraftStatus = 'draft' | 'superseded' | 'approved_for_pdf'

export type WorkforceContractingAiRunStatus = 'pending' | 'succeeded' | 'failed'
export type LanguageParityStatus = 'pass' | 'warning' | 'fail'
export type ClauseRisk = 'none' | 'low' | 'medium' | 'high'

// ── Canonical structured content (bilingual). The draft stores this in
//    structured_content_json; validators (Slice 2) + the AI adapter (Slice 3) consume it. ──

export interface WorkforceContractingSection {
  sectionCode: string
  heading: string
  body: string
  sourceFactRefs: string[]
  clauseRisk: ClauseRisk
}

export interface WorkforceContractingLocalizedDraft {
  title: string
  sections: WorkforceContractingSection[]
}

export interface WorkforceContractingStructuredContent {
  contractVersion: 'workforce_contracting_structured_content.v1'
  documentKind: WorkforceContractingCaseKind
  jurisdictionPackCode: string
  authoritativeLanguage: ContractLanguage
  localizedDrafts: Record<ContractLanguage, WorkforceContractingLocalizedDraft>
}

// ── Aggregate row shapes (mapped from PG). ──

export interface WorkforceContractingCase {
  caseId: string
  caseKind: WorkforceContractingCaseKind
  subjectIdentityProfileId: string
  memberId: string | null
  workRelationshipOnboardingCaseId: string | null
  sourceOfferCaseId: string | null
  operatingEntityOrganizationId: string
  jurisdictionPackCode: string
  requiredLanguages: ContractLanguage[]
  authoritativeLanguage: ContractLanguage
  signableFormat: SignableFormat
  signatureProvider: SignatureProvider
  status: WorkforceContractingCaseStatus
  targetStartDate: string | null
  contractTypeSnapshot: string | null
  payRegimeSnapshot: string | null
  payrollViaSnapshot: string | null
  legalReviewReference: string | null
  // TASK-1023 — case-owned signable PDF (private asset); TASK-1024 — signed PDF + current request.
  pdfAssetId: string | null
  signedPdfAssetId: string | null
  signatureRequestId: string | null
  createdByUserId: string | null
  voidedAt: string | null
  voidReason: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface WorkforceContractingDraft {
  draftId: string
  caseId: string
  draftVersion: number
  source: WorkforceContractingDraftSource
  status: WorkforceContractingDraftStatus
  structuredContentJson: WorkforceContractingStructuredContent | Record<string, unknown>
  validationSnapshotJson: WorkforceContractingValidationResult | null
  languageParitySnapshotJson: Record<string, unknown> | null
  contentHash: string
  approvedAt: string | null
  approvedByUserId: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkforceContractingAiRun {
  aiRunId: string
  caseId: string
  draftId: string | null
  provider: string
  model: string
  promptVersion: string
  promptHash: string | null
  inputSnapshotHash: string
  outputHash: string | null
  status: WorkforceContractingAiRunStatus
  languageParityStatus: LanguageParityStatus | null
  usageJson: Record<string, unknown> | null
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkforceContractingCaseEvent {
  eventId: string
  caseId: string
  eventKind: string
  fromStatus: string | null
  toStatus: string | null
  payloadJson: Record<string, unknown>
  actorUserId: string | null
  occurredAt: string
}

// ── Deterministic validation result (jurisdiction pack output, Slice 2). ──

export interface WorkforceContractingValidationBlocker {
  code: string
  severity: 'blocking'
  message: string
  sourceRef: string
}

export interface WorkforceContractingValidationWarning {
  code: string
  severity: 'warning'
  message: string
  sourceRef: string
}

export interface WorkforceContractingLanguageParity {
  status: LanguageParityStatus
  comparedSectionCodes: string[]
  notes: string[]
}

export interface WorkforceContractingValidationResult {
  jurisdictionPackCode: string
  requiredLanguages: ContractLanguage[]
  authoritativeLanguage: ContractLanguage
  readyForReview: boolean
  readyForPdf: boolean
  languageParity: WorkforceContractingLanguageParity
  blockers: WorkforceContractingValidationBlocker[]
  warnings: WorkforceContractingValidationWarning[]
}

// ── Canonical constants ──

export const REQUIRED_LANGUAGES: ContractLanguage[] = ['es-CL', 'en-US']

/** Initial status when a case is opened, by kind (§3.1 / §3.2). */
export const INITIAL_STATUS_BY_KIND: Record<WorkforceContractingCaseKind, WorkforceContractingCaseStatus> = {
  offer_letter: 'draft',
  employment_contract: 'intake_pending'
}

/** Terminal void target per kind (offer → withdrawn; contract → voided). */
export const VOID_STATUS_BY_KIND: Record<WorkforceContractingCaseKind, WorkforceContractingCaseStatus> = {
  offer_letter: 'withdrawn',
  employment_contract: 'voided'
}

/** Approval target per kind (offer → approved; contract → internal_approved). */
export const APPROVE_STATUS_BY_KIND: Record<WorkforceContractingCaseKind, WorkforceContractingCaseStatus> = {
  offer_letter: 'approved',
  employment_contract: 'internal_approved'
}

export class WorkforceContractingValidationError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'WorkforceContractingValidationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}
