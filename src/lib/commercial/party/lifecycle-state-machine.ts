import 'server-only'

import type { LifecycleStage } from './types'

// TASK-535: canonical state machine for party lifecycle transitions.
// Source: GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1 §4.2.
//
// A transition from NULL → stage is always allowed (bootstrap or new party
// creation). Explicit transitions are allow-listed here. Anything not listed
// is rejected by promoteParty with InvalidTransitionError.

const ALLOWED_TRANSITIONS: Record<LifecycleStage, readonly LifecycleStage[]> = {
  prospect: ['opportunity', 'active_client', 'disqualified'],
  opportunity: ['active_client', 'disqualified', 'prospect'],
  active_client: ['inactive', 'churned', 'provider_only'],
  inactive: ['active_client', 'churned'],

  // Terminal stages — only re-enterable via operator_override, which still has
  // to go through promoteParty with the explicit source. Treating these as
  // terminal here is a safety net; the command gates the override by capability.
  churned: ['active_client'],
  disqualified: ['prospect'],
  provider_only: []
} as const

const TERMINAL_STAGES: readonly LifecycleStage[] = ['provider_only']

const isLifecycleStage = (value: string | null): value is LifecycleStage => {
  if (value === null) return false
  
return value in ALLOWED_TRANSITIONS
}

export const isTransitionAllowed = (
  from: LifecycleStage | null,
  to: LifecycleStage
): boolean => {
  if (from === to) return false
  if (from === null) return true
  
return ALLOWED_TRANSITIONS[from].includes(to)
}

export const isTerminalStage = (stage: LifecycleStage): boolean =>
  TERMINAL_STAGES.includes(stage)

export const getAllowedNextStages = (from: LifecycleStage | null): readonly LifecycleStage[] => {
  if (from === null) {
    return Object.keys(ALLOWED_TRANSITIONS) as LifecycleStage[]
  }

  return ALLOWED_TRANSITIONS[from]
}

export const parseLifecycleStage = (value: string | null | undefined): LifecycleStage | null => {
  if (!value) return null
  
return isLifecycleStage(value) ? value : null
}

export { ALLOWED_TRANSITIONS }
