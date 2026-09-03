import 'server-only'

import { derivePolicy, type ExitCaseFacts, type WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import { deriveOffboardingCaseReview, type OffboardingCaseReviewDerivation } from './review-policy'
import type { OffboardingCase, ReviewOffboardingCaseInput } from './types'

/**
 * TASK-1349 — Impact preview of a review BEFORE any write.
 *
 * Runs the same pure derivation the command applies and, on top of it, the
 * canonical payroll policy (`derivePolicy`) for the periods the decision
 * touches: the cutoff month, the month after it and the current month. No
 * IO on the case; the payroll effect is computed from the hypothetical facts,
 * never from persisted state — so the operator sees what WOULD happen.
 */

export interface OffboardingCaseReviewPreview {
  derivation: OffboardingCaseReviewDerivation
  payrollEffect: Array<{
    periodId: string
    periodStart: string
    periodEnd: string
    /** Policy the resolver would return once the review is persisted and the case reaches `approved`. */
    projectionPolicy: WorkforceExitPayrollEligibilityWindow['projectionPolicy']
    reviewRequired: boolean
    cutoffDate: string | null
    warnings: WorkforceExitPayrollEligibilityWindow['warnings']
  }>
  /**
   * `true` when the next status after the review would still keep the period
   * blocked for payroll (relationship_ended landing in needs_review). Tells the
   * operator the approval is the step that releases the period.
   */
  approvalStillRequiredForPayroll: boolean
}

const monthOf = (isoDate: string) => isoDate.slice(0, 7)

const periodRange = (periodId: string) => {
  const [year, month] = periodId.split('-').map(Number)

  return {
    periodId,
    periodStart: `${periodId}-01`,
    periodEnd: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  }
}

const nextMonth = (periodId: string) => {
  const [year, month] = periodId.split('-').map(Number)
  const date = new Date(Date.UTC(year, month, 1))

  return date.toISOString().slice(0, 7)
}

export const previewOffboardingCaseReview = ({
  current,
  input,
  actorUserId,
  canApprove,
  today = new Date().toISOString().slice(0, 10)
}: {
  current: OffboardingCase
  input: ReviewOffboardingCaseInput
  actorUserId: string
  canApprove: boolean
  today?: string
}): OffboardingCaseReviewPreview => {
  const derivation = deriveOffboardingCaseReview({ current, input, actorUserId, canApprove })
  const { next } = derivation

  // Facts as they will be once the decision is APPROVED (the state that
  // actually governs payroll for non-identity lanes). For `needs_review` the
  // resolver keeps demanding review — surfaced via `approvalStillRequiredForPayroll`.
  const approvedFacts: ExitCaseFacts = {
    memberId: current.memberId ?? 'unknown',
    memberActive: true,
    exitCaseId: current.offboardingCaseId,
    exitCasePublicId: current.publicId,
    exitLane: next.lane.ruleLane,
    exitStatus: 'approved',
    exitSource: current.source,
    contractTypeSnapshot: current.contractTypeSnapshot === 'unknown' ? null : current.contractTypeSnapshot,
    lastWorkingDay: next.lastWorkingDay,
    effectiveDate: next.effectiveDate,
    caseSignalDate: current.createdAt.slice(0, 10),
    reenteredAfterExit: false
  }

  const cutoffMonth = monthOf(next.lastWorkingDay)
  const periodIds = Array.from(new Set([cutoffMonth, nextMonth(cutoffMonth), monthOf(today)])).sort()

  const payrollEffect = periodIds.map(periodId => {
    const range = periodRange(periodId)
    const window = derivePolicy(approvedFacts, range.periodStart, range.periodEnd)

    return {
      ...range,
      projectionPolicy: window.projectionPolicy,
      reviewRequired: window.reviewRequired,
      cutoffDate: window.cutoffDate,
      warnings: window.warnings
    }
  })

  return {
    derivation,
    payrollEffect,
    approvalStillRequiredForPayroll: next.status !== 'approved' && next.separationType !== 'identity_only'
  }
}
