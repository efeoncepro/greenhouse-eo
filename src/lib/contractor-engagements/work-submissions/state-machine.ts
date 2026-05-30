/**
 * TASK-792 — Contractor work submission lifecycle state machine (pure).
 *
 * Canonical transition matrix. Mirror of the DB trigger
 * `greenhouse_hr.contractor_work_submissions_validate_transition`
 * (migration 20260531000000000). Both layers MUST stay aligned.
 *
 *   draft     -> submitted | cancelled
 *   submitted -> approved | disputed | rejected | cancelled
 *   disputed  -> submitted | rejected | cancelled
 *   approved  -> cancelled
 *   rejected  -> (terminal)
 *   cancelled -> (terminal)
 *
 * Same-status (no-op) is always allowed (metadata / consumption updates).
 */
import type { ContractorWorkSubmissionStatus } from './types'

export const WORK_SUBMISSION_TRANSITIONS: Record<
  ContractorWorkSubmissionStatus,
  readonly ContractorWorkSubmissionStatus[]
> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'disputed', 'rejected', 'cancelled'],
  disputed: ['submitted', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: [],
  cancelled: []
}

export const TERMINAL_WORK_SUBMISSION_STATUSES: readonly ContractorWorkSubmissionStatus[] = [
  'rejected',
  'cancelled'
]

export const isTerminalWorkSubmissionStatus = (
  status: ContractorWorkSubmissionStatus
): boolean => TERMINAL_WORK_SUBMISSION_STATUSES.includes(status)

export const isValidWorkSubmissionTransition = (
  from: ContractorWorkSubmissionStatus,
  to: ContractorWorkSubmissionStatus
): boolean => {
  if (from === to) {
    return true
  }

  return WORK_SUBMISSION_TRANSITIONS[from].includes(to)
}

export class ContractorWorkSubmissionTransitionError extends Error {
  readonly code = 'invalid_work_submission_transition'
  readonly from: ContractorWorkSubmissionStatus
  readonly to: ContractorWorkSubmissionStatus

  constructor(from: ContractorWorkSubmissionStatus, to: ContractorWorkSubmissionStatus) {
    super(`Transición de work submission inválida: ${from} → ${to}.`)
    this.name = 'ContractorWorkSubmissionTransitionError'
    this.from = from
    this.to = to
  }
}

export const assertValidWorkSubmissionTransition = (
  from: ContractorWorkSubmissionStatus,
  to: ContractorWorkSubmissionStatus
): void => {
  if (!isValidWorkSubmissionTransition(from, to)) {
    throw new ContractorWorkSubmissionTransitionError(from, to)
  }
}

/** Maps a review action to its target status. */
export const REVIEW_ACTION_TARGET: Record<'approve' | 'dispute' | 'reject', ContractorWorkSubmissionStatus> = {
  approve: 'approved',
  dispute: 'disputed',
  reject: 'rejected'
}
