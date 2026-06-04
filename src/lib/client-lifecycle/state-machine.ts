// TASK-992 — Client Lifecycle state machine (GREENHOUSE_CLIENT_LIFECYCLE_V1 §6).
// Pure functions; primary enforcement of the transition matrix. The DB trigger
// client_lifecycle_case_transition_check is defense-in-depth layer 1.

import {
  ClientLifecycleValidationError,
  type ClientLifecycleCaseStatus,
  type ClientLifecycleItemStatus
} from './types'

// §6.3 allowed case transitions matrix
const CASE_TRANSITIONS: Record<ClientLifecycleCaseStatus, ClientLifecycleCaseStatus[]> = {
  draft: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'completed', 'cancelled'],
  blocked: ['in_progress', 'completed', 'cancelled'],
  completed: [],
  cancelled: []
}

// §6.2 checklist item transitions
const ITEM_TRANSITIONS: Record<ClientLifecycleItemStatus, ClientLifecycleItemStatus[]> = {
  pending: ['in_progress', 'completed', 'skipped', 'blocked', 'not_applicable'],
  in_progress: ['completed', 'skipped', 'blocked', 'not_applicable'],
  blocked: ['in_progress', 'completed', 'skipped', 'not_applicable'],
  // terminal states
  completed: [],
  skipped: [],
  not_applicable: []
}

export const isTerminalCaseStatus = (status: ClientLifecycleCaseStatus) =>
  status === 'completed' || status === 'cancelled'

export const isTerminalItemStatus = (status: ClientLifecycleItemStatus) =>
  status === 'completed' || status === 'skipped' || status === 'not_applicable'

export const isCaseTransitionAllowed = (
  from: ClientLifecycleCaseStatus,
  to: ClientLifecycleCaseStatus
) => CASE_TRANSITIONS[from].includes(to)

export const assertCaseTransition = (
  from: ClientLifecycleCaseStatus,
  to: ClientLifecycleCaseStatus
) => {
  if (from === to) return

  if (!CASE_TRANSITIONS[from].includes(to)) {
    throw new ClientLifecycleValidationError(
      'invalid_case_transition',
      `Transición de caso inválida: ${from} -> ${to}.`,
      409,
      { from, to, allowed: CASE_TRANSITIONS[from] }
    )
  }
}

export const isItemTransitionAllowed = (
  from: ClientLifecycleItemStatus,
  to: ClientLifecycleItemStatus
) => from === to || ITEM_TRANSITIONS[from].includes(to)

export const assertItemTransition = (
  from: ClientLifecycleItemStatus,
  to: ClientLifecycleItemStatus
) => {
  if (from === to) return

  if (!ITEM_TRANSITIONS[from].includes(to)) {
    throw new ClientLifecycleValidationError(
      'invalid_item_transition',
      `Transición de ítem inválida: ${from} -> ${to}.`,
      409,
      { from, to, allowed: ITEM_TRANSITIONS[from] }
    )
  }
}
