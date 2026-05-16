import 'server-only'

import { derivePolicy, type ExitCaseFacts } from './policy'
import { fetchExitCaseFactsForMembers } from './query'
import type { WorkforceExitPayrollEligibilityWindow } from './types'

export type {
  ExitLane,
  ExitStatus,
  ProjectionPolicy,
  RelationshipStatus,
  ExitEligibilityWarning,
  ExitEligibilityWarningCode,
  WorkforceExitPayrollEligibilityWindow
} from './types'

export type { ExitCaseFacts } from './policy'
export { computeCutoff, derivePolicy } from './policy'
export { isPayrollExitEligibilityWindowEnabled } from './flag'

/**
 * Canonical resolver — TASK-890 single source of truth.
 *
 * Returns the per-member payroll-scope policy for the given period window.
 * Consumer responsibilities:
 *
 * - Branch on `projectionPolicy`, NOT on `(exitLane, exitStatus, cutoffDate)`.
 * - Skip the member entirely when `projectionPolicy` is `exclude_*`.
 * - Use `eligibleFrom` / `eligibleTo` to prorate when policy is `partial_until_cutoff`.
 * - Surface warnings to the operator UI when present (info / warning / blocking).
 *
 * NEVER replicate the SQL `NOT EXISTS offboarding_cases ...` gate inline in a
 * callsite — the lint rule `greenhouse/no-inline-payroll-scope-gate` enforces.
 *
 * Spec: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`.
 */
export const resolveExitEligibilityForMembers = async (
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, WorkforceExitPayrollEligibilityWindow>> => {
  const facts = await fetchExitCaseFactsForMembers(memberIds)
  const out = new Map<string, WorkforceExitPayrollEligibilityWindow>()

  for (const memberId of memberIds) {
    const memberFacts: ExitCaseFacts = facts.get(memberId) ?? {
      // Member not found in members table — defensive: treat as inactive.
      memberId,
      memberActive: false,
      exitCaseId: null,
      exitCasePublicId: null,
      exitLane: null,
      exitStatus: null,
      lastWorkingDay: null,
      effectiveDate: null
    }

    out.set(memberId, derivePolicy(memberFacts, periodStart, periodEnd))
  }

  return out
}

/**
 * Thin predicate wrapper. Returns `true` when the member is in payroll scope
 * for the given date (NOT excluded by projection policy).
 *
 * Use this for capability checks, drawer state, single-member decisions.
 * For bulk roster decisions, prefer `resolveExitEligibilityForMembers` directly
 * to amortize the query.
 */
export const isMemberInPayrollScope = async (
  memberId: string,
  asOf: string
): Promise<boolean> => {
  const windows = await resolveExitEligibilityForMembers([memberId], asOf, asOf)
  const window = windows.get(memberId)

  if (!window) return false

  return (
    window.projectionPolicy !== 'exclude_entire_period' &&
    window.projectionPolicy !== 'exclude_from_cutoff'
  )
}
