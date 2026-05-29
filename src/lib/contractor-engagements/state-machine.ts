/**
 * TASK-790 — Contractor engagement lifecycle state machine (pure).
 *
 * Canonical transition matrix. Mirror of the DB trigger
 * `greenhouse_hr.contractor_engagements_validate_transition` (migration
 * 20260529221452562). Both layers MUST stay aligned — defense-in-depth.
 *
 *   draft          -> pending_review | active | cancelled
 *   pending_review -> active | draft | cancelled
 *   active         -> paused | ending | cancelled
 *   paused         -> active | ending | cancelled
 *   ending         -> ended | active | cancelled
 *   ended          -> (terminal)
 *   cancelled      -> (terminal)
 *
 * Same-status (no-op) is always allowed (metadata/risk updates).
 */
import type { ContractorEngagementStatus } from './types'

export const ENGAGEMENT_TRANSITIONS: Record<
  ContractorEngagementStatus,
  readonly ContractorEngagementStatus[]
> = {
  draft: ['pending_review', 'active', 'cancelled'],
  pending_review: ['active', 'draft', 'cancelled'],
  active: ['paused', 'ending', 'cancelled'],
  paused: ['active', 'ending', 'cancelled'],
  ending: ['ended', 'active', 'cancelled'],
  ended: [],
  cancelled: []
}

export const TERMINAL_ENGAGEMENT_STATUSES: readonly ContractorEngagementStatus[] = [
  'ended',
  'cancelled'
]

export const isTerminalEngagementStatus = (status: ContractorEngagementStatus): boolean =>
  TERMINAL_ENGAGEMENT_STATUSES.includes(status)

export const isValidEngagementTransition = (
  from: ContractorEngagementStatus,
  to: ContractorEngagementStatus
): boolean => {
  if (from === to) {
    return true
  }

  return ENGAGEMENT_TRANSITIONS[from].includes(to)
}

export class ContractorEngagementTransitionError extends Error {
  readonly code = 'invalid_engagement_transition'
  readonly from: ContractorEngagementStatus
  readonly to: ContractorEngagementStatus

  constructor(from: ContractorEngagementStatus, to: ContractorEngagementStatus) {
    super(`Transición de engagement inválida: ${from} → ${to}.`)
    this.name = 'ContractorEngagementTransitionError'
    this.from = from
    this.to = to
  }
}

export const assertValidEngagementTransition = (
  from: ContractorEngagementStatus,
  to: ContractorEngagementStatus
): void => {
  if (!isValidEngagementTransition(from, to)) {
    throw new ContractorEngagementTransitionError(from, to)
  }
}
