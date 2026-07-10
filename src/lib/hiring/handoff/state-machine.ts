// TASK-356 — State-machine pura del HiringHandoff (testeable sin DB).
//
// Dos planos de transición:
// - COMMAND (humano, capability hiring.handoff.approve): pending → approved → in_setup →
//   completed (in_setup es opcional: approved → completed directo con downstream_ref);
//   pending|approved|blocked → cancelled. `blocked` NUNCA se alcanza por command — solo
//   el materializer (sistema) bloquea, con código de razón.
// - SYSTEM (materializer reactivo): puede bloquear desde cualquier estado activo ante un
//   supersede/revocación post-aprobación, cancelar un pending/blocked revocado y reabrir
//   un cancelled cuando llega una nueva decisión `selected` (UNIQUE por application:
//   la fila se reutiliza, el audit trail conserva la historia).

import type { HiringHandoffCommandAction, HiringHandoffState } from './types'

const COMMAND_TRANSITIONS: Record<HiringHandoffState, readonly HiringHandoffState[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['in_setup', 'completed', 'cancelled'],
  in_setup: ['completed'],
  completed: [],
  blocked: ['cancelled'],
  cancelled: [],
}

const SYSTEM_TRANSITIONS: Record<HiringHandoffState, readonly HiringHandoffState[]> = {
  // pending/blocked se re-derivan ante supersede (pueden quedarse igual, pasar a blocked
  // o volver a pending); ante revocación pasan a cancelled.
  pending: ['pending', 'blocked', 'cancelled'],
  blocked: ['pending', 'blocked', 'cancelled'],
  // post-aprobación NUNCA se sobrescribe en silencio: supersede/revocación → blocked.
  approved: ['blocked'],
  in_setup: ['blocked'],
  completed: ['blocked'],
  // reopen: nueva decisión `selected` sobre un handoff cancelado reutiliza la fila.
  cancelled: ['pending', 'blocked'],
}

export const COMMAND_ACTION_TARGET: Record<HiringHandoffCommandAction, HiringHandoffState> = {
  approve: 'approved',
  setup: 'in_setup',
  complete: 'completed',
  cancel: 'cancelled',
}

export const isValidCommandTransition = (
  from: HiringHandoffState,
  to: HiringHandoffState,
): boolean => COMMAND_TRANSITIONS[from].includes(to)

export const isValidSystemTransition = (
  from: HiringHandoffState,
  to: HiringHandoffState,
): boolean => SYSTEM_TRANSITIONS[from].includes(to)

/** Estados desde los que el supersede post-aprobación bloquea (nunca sobrescribe). */
export const isPostApprovalState = (state: HiringHandoffState): boolean =>
  state === 'approved' || state === 'in_setup' || state === 'completed'
