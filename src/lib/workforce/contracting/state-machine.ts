// TASK-1019 — Workforce Contracting state machine
// (GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1 §3.1 offer / §3.2 contract).
// Pure functions; PRIMARY enforcement of the transition matrices. The DB trigger
// greenhouse_hr.workforce_contracting_case_transition_check is defense-in-depth layer 1
// and MUST mirror these matrices exactly.

import {
  WorkforceContractingValidationError,
  type EmploymentContractCaseStatus,
  type OfferCaseStatus,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus
} from './types'

// §3.1 — Offer letter transitions.
const OFFER_TRANSITIONS: Record<OfferCaseStatus, OfferCaseStatus[]> = {
  draft: ['ai_drafted', 'withdrawn'],
  ai_drafted: ['pending_internal_review', 'draft', 'withdrawn'],
  pending_internal_review: ['approved', 'ai_drafted', 'rejected', 'withdrawn'],
  approved: ['sent', 'withdrawn'],
  sent: ['viewed', 'accepted', 'rejected', 'expired', 'withdrawn'],
  viewed: ['accepted', 'rejected', 'expired', 'withdrawn'],
  accepted: ['converted_to_contract'],
  // terminal
  rejected: [],
  expired: [],
  withdrawn: [],
  converted_to_contract: []
}

// §3.2 — Employment contract transitions.
const CONTRACT_TRANSITIONS: Record<EmploymentContractCaseStatus, EmploymentContractCaseStatus[]> = {
  intake_pending: ['ai_drafted', 'voided'],
  ai_drafted: ['validation_blocked', 'pending_review', 'voided'],
  validation_blocked: ['ai_drafted', 'pending_review', 'voided'],
  pending_review: ['legal_review', 'validation_blocked', 'needs_amendment', 'rejected', 'voided'],
  legal_review: ['internal_approved', 'needs_amendment', 'rejected', 'voided'],
  internal_approved: ['ready_for_pdf', 'needs_amendment', 'voided'],
  ready_for_pdf: ['ready_for_signature', 'needs_amendment', 'voided'],
  ready_for_signature: ['sent_for_signature', 'needs_amendment', 'voided'],
  sent_for_signature: ['partially_signed', 'fully_signed', 'signature_failed', 'expired', 'voided'],
  partially_signed: ['fully_signed', 'signature_failed', 'expired', 'voided'],
  signature_failed: ['sent_for_signature', 'voided'],
  fully_signed: ['registered_external', 'active'],
  registered_external: ['active'],
  active: ['superseded', 'needs_amendment'],
  needs_amendment: ['ai_drafted', 'pending_review', 'voided'],
  // terminal
  rejected: [],
  voided: [],
  expired: [],
  superseded: []
}

const TERMINAL_OFFER: ReadonlySet<OfferCaseStatus> = new Set([
  'accepted',
  'rejected',
  'expired',
  'withdrawn',
  'converted_to_contract'
])

const TERMINAL_CONTRACT: ReadonlySet<EmploymentContractCaseStatus> = new Set([
  'active',
  'rejected',
  'voided',
  'expired',
  'superseded'
])

const allowedTransitionsFor = (
  caseKind: WorkforceContractingCaseKind,
  from: WorkforceContractingCaseStatus
): WorkforceContractingCaseStatus[] => {
  if (caseKind === 'offer_letter') {
    return OFFER_TRANSITIONS[from as OfferCaseStatus] ?? []
  }

  return CONTRACT_TRANSITIONS[from as EmploymentContractCaseStatus] ?? []
}

export const isTerminalStatus = (
  caseKind: WorkforceContractingCaseKind,
  status: WorkforceContractingCaseStatus
): boolean =>
  caseKind === 'offer_letter'
    ? TERMINAL_OFFER.has(status as OfferCaseStatus)
    : TERMINAL_CONTRACT.has(status as EmploymentContractCaseStatus)

export const isCaseTransitionAllowed = (
  caseKind: WorkforceContractingCaseKind,
  from: WorkforceContractingCaseStatus,
  to: WorkforceContractingCaseStatus
): boolean => from === to || allowedTransitionsFor(caseKind, from).includes(to)

export const assertCaseTransition = (
  caseKind: WorkforceContractingCaseKind,
  from: WorkforceContractingCaseStatus,
  to: WorkforceContractingCaseStatus
): void => {
  if (from === to) return

  if (!allowedTransitionsFor(caseKind, from).includes(to)) {
    throw new WorkforceContractingValidationError(
      'invalid_case_transition',
      `Transición de caso inválida (${caseKind}): ${from} -> ${to}.`,
      409,
      { caseKind, from, to, allowed: allowedTransitionsFor(caseKind, from) }
    )
  }
}
