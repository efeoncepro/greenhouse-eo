// TASK-1019 Slice 4 — Product-shaped projection (pure). Derives the operational
// metadata the Command Center / Guided Builder / Bilingual Review Desk / collaborator
// viewer need WITHOUT re-running business logic in JSX. NOT server-only.

import {
  type LanguageParityStatus,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus
} from './types'

export type ContractingRiskLevel = 'low' | 'medium' | 'high'

/** Derived no-op until EPIC-001 signature orchestration exists. */
export type SignatureReadinessStatus =
  | 'not_applicable'
  | 'not_ready'
  | 'ready_for_pdf'
  | 'ready_for_signature'
  | 'pending_signature'
  | 'signed'

export interface ContractingCaseProjection {
  nextActionCode: string
  riskLevel: ContractingRiskLevel
  languageParityStatus: LanguageParityStatus | 'unknown'
  missingFactsSummary: number
  signatureReadinessStatus: SignatureReadinessStatus
  authoritativeLanguage: 'es-CL' | 'en-US'
}

const OFFER_NEXT_ACTION: Record<string, string> = {
  draft: 'create_draft',
  ai_drafted: 'review_bilingual_draft',
  pending_internal_review: 'approve_offer',
  approved: 'send_offer',
  sent: 'await_candidate',
  viewed: 'await_candidate',
  accepted: 'convert_to_contract',
  rejected: 'none',
  expired: 'none',
  withdrawn: 'none',
  converted_to_contract: 'none'
}

const CONTRACT_NEXT_ACTION: Record<string, string> = {
  intake_pending: 'create_draft',
  ai_drafted: 'review_bilingual_draft',
  validation_blocked: 'resolve_blockers',
  pending_review: 'advance_review',
  legal_review: 'approve_contract',
  internal_approved: 'generate_pdf',
  ready_for_pdf: 'generate_pdf',
  ready_for_signature: 'send_to_signature',
  sent_for_signature: 'remind_signer',
  partially_signed: 'remind_signer',
  fully_signed: 'register_external',
  registered_external: 'mark_active',
  active: 'none',
  rejected: 'none',
  voided: 'none',
  expired: 'none',
  superseded: 'none',
  signature_failed: 'retry_signature',
  needs_amendment: 'create_draft'
}

export const deriveNextActionCode = (
  caseKind: WorkforceContractingCaseKind,
  status: WorkforceContractingCaseStatus
): string =>
  (caseKind === 'offer_letter' ? OFFER_NEXT_ACTION[status] : CONTRACT_NEXT_ACTION[status]) ?? 'none'

const SIGNATURE_READINESS: Record<string, SignatureReadinessStatus> = {
  ready_for_pdf: 'ready_for_pdf',
  ready_for_signature: 'ready_for_signature',
  sent_for_signature: 'pending_signature',
  partially_signed: 'pending_signature',
  fully_signed: 'signed',
  registered_external: 'signed',
  active: 'signed'
}

export const deriveSignatureReadiness = (
  caseKind: WorkforceContractingCaseKind,
  status: WorkforceContractingCaseStatus
): SignatureReadinessStatus => {
  if (caseKind === 'offer_letter') return 'not_applicable'

  return SIGNATURE_READINESS[status] ?? 'not_ready'
}

export interface DeriveRiskInput {
  status: WorkforceContractingCaseStatus
  blockerCount: number
  requiresLegalReview: boolean
  hasLegalReviewReference: boolean
}

export const deriveRiskLevel = (input: DeriveRiskInput): ContractingRiskLevel => {
  if (input.status === 'validation_blocked' || input.blockerCount > 0) return 'high'
  if (input.requiresLegalReview && !input.hasLegalReviewReference) return 'high'
  if (input.status === 'legal_review' || input.requiresLegalReview) return 'medium'

  return 'low'
}

export interface BuildCaseProjectionInput {
  caseKind: WorkforceContractingCaseKind
  status: WorkforceContractingCaseStatus
  authoritativeLanguage: 'es-CL' | 'en-US'
  blockerCount: number
  languageParityStatus: LanguageParityStatus | 'unknown'
  requiresLegalReview: boolean
  hasLegalReviewReference: boolean
}

export const buildCaseProjection = (input: BuildCaseProjectionInput): ContractingCaseProjection => ({
  nextActionCode: deriveNextActionCode(input.caseKind, input.status),
  riskLevel: deriveRiskLevel({
    status: input.status,
    blockerCount: input.blockerCount,
    requiresLegalReview: input.requiresLegalReview,
    hasLegalReviewReference: input.hasLegalReviewReference
  }),
  languageParityStatus: input.languageParityStatus,
  missingFactsSummary: input.blockerCount,
  signatureReadinessStatus: deriveSignatureReadiness(input.caseKind, input.status),
  authoritativeLanguage: input.authoritativeLanguage
})
