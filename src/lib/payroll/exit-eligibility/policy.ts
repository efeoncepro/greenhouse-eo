import 'server-only'

import type {
  ExitEligibilityWarning,
  ExitLane,
  ExitStatus,
  RelationshipStatus,
  WorkforceExitPayrollEligibilityWindow
} from './types'

/**
 * Pure policy derivation — given the facts of an offboarding case + member +
 * period window, returns the canonical `WorkforceExitPayrollEligibilityWindow`.
 *
 * NO DB access. NO IO. 100% testable with synthetic fixtures.
 *
 * Spec: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` §2.
 */

// Lanes where Greenhouse does NOT pay the member directly. Threshold = `approved+`.
const LANES_EXIT_FROM_APPROVED: ReadonlySet<ExitLane> = new Set<ExitLane>([
  'external_payroll',
  'non_payroll'
])

// Lanes where Greenhouse pays through executed (finiquito Chile / relationship transition).
// Threshold = `executed` only.
const LANES_EXIT_FROM_EXECUTED: ReadonlySet<ExitLane> = new Set<ExitLane>([
  'internal_payroll',
  'relationship_transition'
])

// Statuses considered "decided" (operator has signed off). Used for non-internal lanes.
const STATUSES_DECIDED: ReadonlySet<ExitStatus> = new Set<ExitStatus>([
  'approved',
  'scheduled',
  'executed'
])

// Non-blocking case statuses for payroll projection. Member stays in scope.
const STATUSES_NON_BLOCKING: ReadonlySet<ExitStatus> = new Set<ExitStatus>([
  'draft',
  'needs_review',
  'blocked',
  'cancelled'
])

export type ExitCaseFacts = {
  memberId: string
  memberActive: boolean
  exitCaseId: string | null
  exitCasePublicId: string | null
  exitLane: ExitLane | null
  exitStatus: ExitStatus | null
  lastWorkingDay: string | null
  effectiveDate: string | null
}

/**
 * Canonical cutoff calculation. NEVER use `last_working_day` alone — between
 * `approved` and `scheduled`, the schema CHECK constraint allows `LWD IS NULL`
 * while `effective_date` is already populated.
 */
export const computeCutoff = (
  lastWorkingDay: string | null,
  effectiveDate: string | null
): string | null => lastWorkingDay ?? effectiveDate ?? null

const inferRelationshipStatus = (
  exitStatus: ExitStatus | null,
  memberActive: boolean
): RelationshipStatus => {
  if (!memberActive) return 'ended'
  if (!exitStatus) return 'active'
  if (exitStatus === 'cancelled') return 'active'
  if (exitStatus === 'executed') return 'ended'
  if (exitStatus === 'approved' || exitStatus === 'scheduled') return 'scheduled_exit'

  // 'draft' | 'needs_review' | 'blocked'
  return 'active'
}

const isDateInRangeInclusive = (date: string, start: string, end: string): boolean =>
  date >= start && date <= end

const buildBaseWindow = (
  facts: ExitCaseFacts,
  periodStart: string,
  periodEnd: string,
  cutoffDate: string | null,
  relationshipStatus: RelationshipStatus
): Pick<
  WorkforceExitPayrollEligibilityWindow,
  | 'memberId'
  | 'periodStart'
  | 'periodEnd'
  | 'relationshipStatus'
  | 'exitCaseId'
  | 'exitCasePublicId'
  | 'exitLane'
  | 'exitStatus'
  | 'cutoffDate'
> => ({
  memberId: facts.memberId,
  periodStart,
  periodEnd,
  relationshipStatus,
  exitCaseId: facts.exitCaseId,
  exitCasePublicId: facts.exitCasePublicId,
  exitLane: facts.exitLane,
  exitStatus: facts.exitStatus,
  cutoffDate
})

/**
 * Derive the canonical eligibility window from case facts + period.
 *
 * Decision matrix (§2 ADR):
 *
 * - `members.active = FALSE` → `exclude_entire_period`
 * - no case OR status ∈ {draft, needs_review, blocked, cancelled} → `full_period`
 *   (+ info warning if draft/needs_review con cutoff en periodo)
 * - lane `identity_only` → `full_period` (identity doesn't gate payroll)
 * - lane `unknown` → `full_period` + `unclassified_lane` warning (conservador)
 * - status decided + no cutoff date → `full_period` + `effective_date_only_no_lwd` warning
 * - cutoff < periodStart → `exclude_entire_period` (any lane)
 * - cutoff > periodEnd → `full_period` (exit is after this period)
 * - cutoff in [periodStart, periodEnd]:
 *   - external_payroll | non_payroll → `exclude_from_cutoff` (Greenhouse no paga)
 *   - internal_payroll | relationship_transition:
 *     - executed → `partial_until_cutoff` (prorratear hasta LWD)
 *     - approved/scheduled (no executed) → `full_period` (esperar finiquito)
 */
export const derivePolicy = (
  facts: ExitCaseFacts,
  periodStart: string,
  periodEnd: string
): WorkforceExitPayrollEligibilityWindow => {
  const warnings: ExitEligibilityWarning[] = []
  const cutoffDate = computeCutoff(facts.lastWorkingDay, facts.effectiveDate)
  const relationshipStatus = inferRelationshipStatus(facts.exitStatus, facts.memberActive)
  const base = buildBaseWindow(facts, periodStart, periodEnd, cutoffDate, relationshipStatus)

  // Member inactive → defensive exclusion regardless of case
  if (!facts.memberActive) {
    return {
      ...base,
      relationshipStatus: 'ended',
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_entire_period',
      warnings
    }
  }

  // No case OR case in non-blocking status → full period
  if (!facts.exitStatus || STATUSES_NON_BLOCKING.has(facts.exitStatus)) {
    if (
      (facts.exitStatus === 'draft' || facts.exitStatus === 'needs_review') &&
      cutoffDate &&
      isDateInRangeInclusive(cutoffDate, periodStart, periodEnd)
    ) {
      warnings.push({
        code: 'draft_case_with_cutoff_in_period',
        severity: 'info',
        messageKey: 'exit_eligibility.draft_case_with_cutoff_in_period',
        evidence: { cutoffDate, exitLane: facts.exitLane, exitStatus: facts.exitStatus }
      })
    }

    return {
      ...base,
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // From here: exitStatus ∈ STATUSES_DECIDED ({approved, scheduled, executed})
  // identity_only: never gates payroll (separate domain)
  if (facts.exitLane === 'identity_only') {
    return {
      ...base,
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // unknown / null lane: conservador — full_period + warning
  if (!facts.exitLane || facts.exitLane === 'unknown') {
    warnings.push({
      code: 'unclassified_lane',
      severity: 'warning',
      messageKey: 'exit_eligibility.unclassified_lane',
      evidence: { exitStatus: facts.exitStatus, cutoffDate }
    })

    return {
      ...base,
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // Decided status but no cutoff date — schema violation OR rare
  // relationship_transition pre-LWD. Surface warning; default to full_period.
  if (!cutoffDate) {
    warnings.push({
      code: 'effective_date_only_no_lwd',
      severity: 'warning',
      messageKey: 'exit_eligibility.effective_date_only_no_lwd',
      evidence: { exitStatus: facts.exitStatus, exitLane: facts.exitLane }
    })

    return {
      ...base,
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // Cutoff before periodStart → exit happened in a prior period
  if (cutoffDate < periodStart) {
    return {
      ...base,
      relationshipStatus: 'ended',
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_entire_period',
      warnings
    }
  }

  // Cutoff after periodEnd → exit is scheduled but not in this period
  if (cutoffDate > periodEnd) {
    return {
      ...base,
      relationshipStatus: 'scheduled_exit',
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // Cutoff inside period → apply per-lane threshold
  if (LANES_EXIT_FROM_APPROVED.has(facts.exitLane)) {
    // external_payroll | non_payroll: Greenhouse doesn't pay internal
    // → exclude from cutoff (informationally: cutoff is in this period)
    return {
      ...base,
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_from_cutoff',
      warnings
    }
  }

  if (LANES_EXIT_FROM_EXECUTED.has(facts.exitLane)) {
    if (facts.exitStatus === 'executed') {
      return {
        ...base,
        relationshipStatus: 'ended',
        eligibleFrom: periodStart,
        eligibleTo: cutoffDate,
        projectionPolicy: 'partial_until_cutoff',
        warnings
      }
    }

    // approved/scheduled in internal lane: Greenhouse still pays full
    // until finiquito is executed (TASK-862/863 contract preserves this).
    return {
      ...base,
      relationshipStatus: 'scheduled_exit',
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      warnings
    }
  }

  // Defensive fallback — should not reach here. If schema adds a new lane,
  // CHECK constraint blocks it from persisting AND this fallback alerts.
  STATUSES_DECIDED // referenced for compile-time anchor (unused at runtime)
  warnings.push({
    code: 'unclassified_lane',
    severity: 'warning',
    messageKey: 'exit_eligibility.unclassified_lane',
    evidence: { exitLane: facts.exitLane, exitStatus: facts.exitStatus }
  })

  return {
    ...base,
    eligibleFrom: periodStart,
    eligibleTo: periodEnd,
    projectionPolicy: 'full_period',
    warnings
  }
}
