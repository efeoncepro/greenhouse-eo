// TASK-490 — Signature request state machine. Two distinct concerns (arch-architect 4-pillar
// refinement): operator-initiated transitions are STRICT (send/cancel); provider-driven status is
// MONOTONIC and tolerant of out-of-order webhook callbacks (a late lower-rank event never regresses
// a more-advanced status). This satisfies the acceptance "el trail soporta callbacks fuera de orden".

import { SignatureValidationError, type SignatureRequestStatus } from './types'

export const TERMINAL_SIGNATURE_STATUSES: ReadonlySet<SignatureRequestStatus> = new Set([
  'completed',
  'cancelled',
  'failed',
  'expired'
])

// Operator-initiated transitions (strict). The operator can send a draft and cancel a non-terminal
// request; advancement to partially_signed/completed/failed/expired is provider-driven only.
const OPERATOR_TRANSITIONS: Record<SignatureRequestStatus, readonly SignatureRequestStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['cancelled'],
  partially_signed: ['cancelled'],
  completed: [],
  cancelled: [],
  failed: [],
  expired: []
}

export const isOperatorTransitionAllowed = (
  from: SignatureRequestStatus,
  to: SignatureRequestStatus
): boolean => OPERATOR_TRANSITIONS[from].includes(to)

export const assertSignatureOperatorTransition = (
  from: SignatureRequestStatus,
  to: SignatureRequestStatus
): void => {
  if (!isOperatorTransitionAllowed(from, to)) {
    throw new SignatureValidationError(
      'invalid_signature_transition',
      `Transición de firma no permitida: ${from} → ${to}.`,
      409
    )
  }
}

// Monotonic rank for provider-driven status (out-of-order callback tolerance).
const STATUS_RANK: Record<SignatureRequestStatus, number> = {
  draft: 0,
  sent: 1,
  partially_signed: 2,
  completed: 3,
  cancelled: 3,
  failed: 3,
  expired: 3
}

/**
 * Apply a provider-reported status to the current status, monotonically. Returns the resulting
 * status. A terminal current status is never changed; a non-terminal current only advances to a
 * strictly higher rank (so a late `partially_signed` after `completed` is a no-op). This makes the
 * webhook ingestion idempotent + order-independent.
 */
export const applyProviderStatus = (
  current: SignatureRequestStatus,
  incoming: SignatureRequestStatus
): SignatureRequestStatus => {
  if (TERMINAL_SIGNATURE_STATUSES.has(current)) return current
  if (STATUS_RANK[incoming] > STATUS_RANK[current]) return incoming
  
return current
}
