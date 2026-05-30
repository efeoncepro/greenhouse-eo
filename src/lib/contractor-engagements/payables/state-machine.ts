/**
 * TASK-793 — Contractor payable lifecycle state machine (pure).
 *
 * Mirror of the DB trigger `greenhouse_hr.contractor_payables_validate_transition`
 * (migration 20260531010000000). Both layers MUST stay aligned.
 *
 *   pending_readiness     -> ready_for_finance | blocked | cancelled
 *   ready_for_finance     -> obligation_created | blocked | cancelled
 *   obligation_created    -> payment_order_created | cancelled
 *   payment_order_created -> paid | cancelled
 *   blocked               -> pending_readiness | cancelled
 *   paid                  -> (terminal)
 *   cancelled             -> (terminal)
 *
 * Same-status (no-op) is always allowed (metadata / finance_obligation_id updates).
 */
import type { ContractorPayableStatus } from './types'

export const PAYABLE_TRANSITIONS: Record<
  ContractorPayableStatus,
  readonly ContractorPayableStatus[]
> = {
  pending_readiness: ['ready_for_finance', 'blocked', 'cancelled'],
  ready_for_finance: ['obligation_created', 'blocked', 'cancelled'],
  obligation_created: ['payment_order_created', 'cancelled'],
  payment_order_created: ['paid', 'cancelled'],
  blocked: ['pending_readiness', 'cancelled'],
  paid: [],
  cancelled: []
}

export const TERMINAL_PAYABLE_STATUSES: readonly ContractorPayableStatus[] = ['paid', 'cancelled']

export const isTerminalPayableStatus = (status: ContractorPayableStatus): boolean =>
  TERMINAL_PAYABLE_STATUSES.includes(status)

export const isValidPayableTransition = (
  from: ContractorPayableStatus,
  to: ContractorPayableStatus
): boolean => {
  if (from === to) {
    return true
  }

  return PAYABLE_TRANSITIONS[from].includes(to)
}

export class ContractorPayableTransitionError extends Error {
  readonly code = 'invalid_payable_transition'
  readonly from: ContractorPayableStatus
  readonly to: ContractorPayableStatus

  constructor(from: ContractorPayableStatus, to: ContractorPayableStatus) {
    super(`Transición de payable inválida: ${from} → ${to}.`)
    this.name = 'ContractorPayableTransitionError'
    this.from = from
    this.to = to
  }
}

export const assertValidPayableTransition = (
  from: ContractorPayableStatus,
  to: ContractorPayableStatus
): void => {
  if (!isValidPayableTransition(from, to)) {
    throw new ContractorPayableTransitionError(from, to)
  }
}
