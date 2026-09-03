import 'server-only'

import type { ContractType } from '@/types/hr-contracts'

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
  contractTypeSnapshot: ContractType | null
  lastWorkingDay: string | null
  effectiveDate: string | null
  /**
   * TASK-1349 — origen del caso (`scim`, `admin`, `manual_hr`, …). Informativo:
   * la política no distingue por origen (una señal SCIM y un draft manual sin
   * resolver exigen la misma revisión); se conserva como evidencia.
   */
  exitSource?: string | null
  /**
   * TASK-1349 — fecha en que la señal de salida entró al sistema
   * (`created_at::date` del caso). Sustituye al cutoff cuando el caso aún no
   * tiene fechas para decidir si la señal es relevante al período.
   */
  caseSignalDate?: string | null
  /**
   * TASK-1349 — `true` cuando existe una compensación que empieza después del
   * cutoff de la salida decidida y no después del fin del período: reingreso.
   */
  reenteredAfterExit?: boolean
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

const STATUSES_UNRESOLVED: ReadonlySet<ExitStatus> = new Set<ExitStatus>(['draft', 'needs_review', 'blocked'])

const hasDecidedExitFact = (facts: ExitCaseFacts, cutoffDate: string | null): boolean =>
  Boolean(facts.exitStatus && STATUSES_DECIDED.has(facts.exitStatus) && cutoffDate)

/**
 * TASK-1349 — an unresolved case (draft / needs_review / blocked) governs the
 * period when its signal (cutoff, or the date the case entered the system when
 * it has no dates yet) is on or before `periodEnd`. A signal that only exists
 * after the period cannot demand a review of it.
 */
export const isUnresolvedExitRelevantToPeriod = (
  facts: Pick<ExitCaseFacts, 'exitStatus' | 'caseSignalDate' | 'lastWorkingDay' | 'effectiveDate'>,
  periodEnd: string
): boolean => {
  if (!facts.exitStatus || !STATUSES_UNRESOLVED.has(facts.exitStatus)) return false

  const signal = computeCutoff(facts.lastWorkingDay, facts.effectiveDate) ?? facts.caseSignalDate ?? null

  if (!signal) return false

  return signal <= periodEnd
}

/**
 * Derive the canonical eligibility window from case facts + period.
 *
 * Decision matrix (§2 ADR + Architecture Decision 2026-09-03):
 *
 * - decided case with cutoff + compensation starting after it (≤ periodEnd) →
 *   re-entry: `full_period` + info `reentry_after_prior_exit` (the previous
 *   exit does not govern this episode)
 * - `members.active = FALSE`:
 *   - with a decided exit fact (approved/scheduled/executed + cutoff) → the
 *     cutoff governs, exactly like an active member (history is preserved:
 *     a May payroll is still eligible when the exit is 2 June)
 *   - without one → `exclude_entire_period` + warning `inactive_without_exit_fact`
 *     (`active` is current availability, never a labor fact)
 * - no case OR status ∈ {draft, needs_review, blocked, cancelled} → `full_period`
 *   (+ info warning if draft/needs_review con cutoff en periodo). When the
 *   unresolved signal is relevant to the period, `reviewRequired = true` +
 *   blocking warning `unresolved_exit_signal`: access alone never removes pay,
 *   but nobody may calculate or approve without deciding.
 * - lane `identity_only` → `full_period` (identity doesn't gate payroll)
 * - lane `unknown` → `full_period` + `unclassified_lane` warning (conservador)
 * - status decided + no cutoff date → `full_period` + `effective_date_only_no_lwd` warning
 * - cutoff < periodStart → `exclude_entire_period` (any lane)
 * - cutoff > periodEnd → `full_period` (exit is after this period)
 * - cutoff in [periodStart, periodEnd]:
 *   - external_payroll | non_payroll | international_internal → `exclude_from_cutoff`
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
  const decidedExitFact = hasDecidedExitFact(facts, cutoffDate)
  const relationshipStatus = inferRelationshipStatus(facts.exitStatus, facts.memberActive || decidedExitFact)
  const base = buildBaseWindow(facts, periodStart, periodEnd, cutoffDate, relationshipStatus)

  // Re-entry: a new compensation episode started after the decided exit.
  // The previous exit does not govern this period.
  if (facts.reenteredAfterExit === true && decidedExitFact && facts.memberActive) {
    warnings.push({
      code: 'reentry_after_prior_exit',
      severity: 'info',
      messageKey: 'exit_eligibility.reentry_after_prior_exit',
      evidence: { cutoffDate, exitCaseId: facts.exitCaseId, exitStatus: facts.exitStatus }
    })

    return {
      ...base,
      relationshipStatus: 'active',
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      reviewRequired: false,
      warnings
    }
  }

  // Member inactive WITHOUT a decided exit fact → defensive exclusion, declared.
  // With a decided fact, the cutoff below governs (history preserved).
  if (!facts.memberActive && !decidedExitFact) {
    warnings.push({
      code: 'inactive_without_exit_fact',
      severity: 'warning',
      messageKey: 'exit_eligibility.inactive_without_exit_fact',
      evidence: { exitCaseId: facts.exitCaseId, exitStatus: facts.exitStatus, exitLane: facts.exitLane }
    })

    return {
      ...base,
      relationshipStatus: 'ended',
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_entire_period',
      reviewRequired: false,
      warnings
    }
  }

  // No case OR case in non-blocking status → full period (+ review when the
  // unresolved signal is relevant to this period).
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

    const reviewRequired = isUnresolvedExitRelevantToPeriod(facts, periodEnd)

    if (reviewRequired) {
      warnings.push({
        code: 'unresolved_exit_signal',
        severity: 'blocking',
        messageKey: 'exit_eligibility.unresolved_exit_signal',
        evidence: {
          exitCaseId: facts.exitCaseId,
          exitCasePublicId: facts.exitCasePublicId,
          exitStatus: facts.exitStatus,
          exitLane: facts.exitLane,
          exitSource: facts.exitSource ?? null,
          cutoffDate,
          caseSignalDate: facts.caseSignalDate ?? null
        }
      })
    }

    return {
      ...base,
      eligibleFrom: periodStart,
      eligibleTo: periodEnd,
      projectionPolicy: 'full_period',
      reviewRequired,
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
      reviewRequired: false,
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
      reviewRequired: false,
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
      reviewRequired: false,
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
      reviewRequired: false,
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
      reviewRequired: false,
      warnings
    }
  }

  // Cutoff inside period → apply per-lane threshold
  const exitsFromApproved =
    LANES_EXIT_FROM_APPROVED.has(facts.exitLane) ||
    (facts.exitLane === 'internal_payroll' && facts.contractTypeSnapshot === 'international_internal')

  if (exitsFromApproved) {
    // external/non-payroll lanes do not use Greenhouse internal payroll;
    // international_internal has no Chile settlement aggregate. Both close
    // eligibility from the approved decision at the cutoff.
    return {
      ...base,
      eligibleFrom: null,
      eligibleTo: null,
      projectionPolicy: 'exclude_from_cutoff',
      reviewRequired: false,
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
        reviewRequired: false,
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
      reviewRequired: false,
      warnings
    }
  }

  // Defensive fallback — should not reach here. If schema adds a new lane,
  // CHECK constraint blocks it from persisting AND this fallback alerts.
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
    reviewRequired: false,
    warnings
  }
}
