/**
 * TASK-1349 — Calculation/approval gate over the canonical exit-eligibility
 * windows. Pure: no IO, shared by payroll readiness (approval) and
 * `calculatePayroll` (official write path) so both refuse the same thing.
 *
 * Two distinct refusals, never collapsed:
 *
 * - `unresolved_exit_signal`: at least one member in scope carries an
 *   unresolved exit (draft / needs_review / blocked) relevant to the period.
 *   The member is still projected (access alone never removes pay) but nobody
 *   may authorize a new calculation/approval until a human decides the case.
 * - `exit_eligibility_unavailable`: the resolver could not run. A preview may
 *   degrade to the legacy roster; an official calculation or approval may not
 *   silently include everybody.
 */
import type { WorkforceExitPayrollEligibilityWindow } from './types'

export type ExitReviewGate = {
  /** Members whose window demands a human decision before calculating. */
  unresolvedExitMemberIds: string[]
  /** `true` when the resolver failed and the gate cannot be evaluated. */
  unavailable: boolean
}

export const collectUnresolvedExitMemberIds = (
  windows: Iterable<Pick<WorkforceExitPayrollEligibilityWindow, 'memberId' | 'reviewRequired'>>
): string[] => {
  const ids: string[] = []

  for (const window of windows) {
    if (window.reviewRequired) ids.push(window.memberId)
  }

  return ids
}

export const evaluateExitReviewGate = (
  windows: Map<string, WorkforceExitPayrollEligibilityWindow> | null
): ExitReviewGate => {
  if (!windows) return { unresolvedExitMemberIds: [], unavailable: true }

  return { unresolvedExitMemberIds: collectUnresolvedExitMemberIds(windows.values()), unavailable: false }
}
