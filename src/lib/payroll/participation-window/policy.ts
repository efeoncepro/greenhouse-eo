import 'server-only'

import { countWeekdays } from '@/lib/payroll/fetch-attendance-for-period'

import type {
  PayrollParticipationFacts,
  PayrollParticipationPolicy,
  PayrollParticipationReasonCode,
  PayrollParticipationWarning,
  PayrollParticipationWindow
} from './types'

/**
 * Derive the canonical participation window for one member in one period.
 *
 * **Pure function**. Zero IO. Deterministic on `facts`. Idempotent. Safe to
 * call inside tight loops; the bulk query layer (Slice 2) batches the IO and
 * feeds this resolver one fact at a time.
 *
 * **Canonical formula** (ADR §"Date Composition"):
 *
 * ```
 * eligibleFrom = max(periodStart, compensation.effective_from)
 * eligibleTo   = min(
 *                   periodEnd,
 *                   compensation.effective_to,
 *                   exitEligibility.eligibleTo (when present)
 *                 )
 * ```
 *
 * **Exit composition** (TASK-890):
 *
 * - `exitEligibility.projectionPolicy === 'exclude_entire_period'`
 *     → policy `exclude`, both bounds `null`.
 * - `exitEligibility.projectionPolicy === 'exclude_from_cutoff'` AND cutoff
 *   `<= periodStart` → policy `exclude` (out before the period started).
 * - Otherwise compose via `eligibleTo`.
 *
 * **Degradation** (TASK-890 disabled / failed): `exitEligibility = null` +
 * warning emitted upstream (Slice 2). Policy derives entry side only;
 * `prorationFactor` reflects entry truncation but NOT exit (exit decision is
 * unknown to the resolver in that case).
 *
 * **Source date disagreement signal**: when `onboardingStartDate` is provided
 * AND differs from `compensationEffectiveFrom` by more than 7 days, the
 * resolver appends a `source_date_disagreement` warning. The resolver still
 * uses `compensationEffectiveFrom` as the canonical entry source (V1 hard
 * rule); onboarding is observed-without-consumed.
 */
export const derivePayrollParticipationPolicy = (
  facts: PayrollParticipationFacts
): PayrollParticipationWindow => {
  const { memberId, periodStart, periodEnd, compensationEffectiveFrom, compensationEffectiveTo, onboardingStartDate, exitEligibility, exitResolverDegraded } = facts

  const warnings: PayrollParticipationWarning[] = []

  if (exitResolverDegraded) {
    warnings.push({
      code: exitResolverDegraded.reason === 'disabled' ? 'exit_resolver_disabled' : 'exit_resolver_failed',
      severity: 'warning',
      messageKey: `payroll.participation_window.warnings.${exitResolverDegraded.reason === 'disabled' ? 'exit_resolver_disabled' : 'exit_resolver_failed'}`,
      evidence: exitResolverDegraded.detail ? { detail: exitResolverDegraded.detail } : undefined
    })
  }

  if (onboardingStartDate && datesDifferByMoreThanDays(onboardingStartDate, compensationEffectiveFrom, 7)) {
    warnings.push({
      code: 'source_date_disagreement',
      severity: 'warning',
      messageKey: 'payroll.participation_window.warnings.source_date_disagreement',
      evidence: {
        compensationEffectiveFrom,
        onboardingStartDate,
        diffDays: Math.abs(daysBetween(onboardingStartDate, compensationEffectiveFrom))
      }
    })
  }

  /*
   * Exit composition path: TASK-890 explicit exclusions short-circuit before
   * we compute bounds. This ensures `exclude_entire_period` and
   * `exclude_from_cutoff` (when cutoff <= periodStart) produce the canonical
   * exclude policy with both bounds null.
   */
  if (exitEligibility) {
    if (exitEligibility.projectionPolicy === 'exclude_entire_period') {
      return buildExcludeWindow({
        memberId,
        periodStart,
        periodEnd,
        reasonCodes: [resolveExitReasonCode(exitEligibility)],
        exitEligibility,
        warnings
      })
    }

    if (
      exitEligibility.projectionPolicy === 'exclude_from_cutoff' &&
      exitEligibility.cutoffDate !== null &&
      exitEligibility.cutoffDate <= periodStart
    ) {
      return buildExcludeWindow({
        memberId,
        periodStart,
        periodEnd,
        reasonCodes: [resolveExitReasonCode(exitEligibility)],
        exitEligibility,
        warnings
      })
    }
  }

  /*
   * Compute canonical bounds. `eligibleFrom = max(periodStart, comp.from)`.
   * `eligibleTo = min(periodEnd, comp.to, exit.eligibleTo)`.
   */
  const eligibleFrom = maxDate(periodStart, compensationEffectiveFrom)

  const eligibleToCandidates: string[] = [periodEnd]

  if (compensationEffectiveTo) {
    eligibleToCandidates.push(compensationEffectiveTo)
  }

  if (exitEligibility?.eligibleTo) {
    eligibleToCandidates.push(exitEligibility.eligibleTo)
  }

  const eligibleTo = minDate(...eligibleToCandidates)

  /*
   * Empty / inverted interval → exclude. Catches edge cases like comp.to <
   * periodStart or comp.from > periodEnd that slipped past the upstream roster
   * gate.
   */
  if (eligibleFrom > eligibleTo) {
    const reasonCodes: PayrollParticipationReasonCode[] = []

    if (compensationEffectiveTo && compensationEffectiveTo < periodStart) {
      reasonCodes.push('relationship_ended')
    } else if (compensationEffectiveFrom > periodEnd) {
      reasonCodes.push('relationship_not_started')
    } else {
      reasonCodes.push('compensation_not_effective')
    }

    if (exitEligibility) {
      const exitReason = resolveExitReasonCode(exitEligibility)

      if (exitReason && !reasonCodes.includes(exitReason)) {
        reasonCodes.push(exitReason)
      }
    }

    return buildExcludeWindow({
      memberId,
      periodStart,
      periodEnd,
      reasonCodes,
      exitEligibility,
      warnings
    })
  }

  /*
   * Compute proration factor on canonical weekday basis. V1 = weekdays.
   * Future: extend `prorationBasis` union to `operational_calendar_*` without
   * breaking consumers.
   */
  const eligibleWorkingDays = countWeekdays(eligibleFrom, eligibleTo)
  const periodWorkingDays = countWeekdays(periodStart, periodEnd)
  const prorationFactor = periodWorkingDays > 0 ? eligibleWorkingDays / periodWorkingDays : 0

  /*
   * Classify policy by which bounds are inside the period. Reason codes carry
   * the forensic detail; policy is the operational discriminator.
   */
  const entryInside = eligibleFrom > periodStart
  const exitInside = eligibleTo < periodEnd

  if (!entryInside && !exitInside) {
    return {
      memberId,
      periodStart,
      periodEnd,
      eligibleFrom,
      eligibleTo,
      policy: 'full_period',
      reasonCodes: ['full_period'],
      prorationFactor: 1,
      prorationBasis: 'weekdays',
      exitEligibility,
      warnings
    }
  }

  const reasonCodes: PayrollParticipationReasonCode[] = []

  if (entryInside) reasonCodes.push('entry_mid_period')

  if (exitInside) {
    if (exitEligibility) {
      reasonCodes.push(resolveExitReasonCode(exitEligibility))
    } else {
      reasonCodes.push('exit_mid_period')
    }
  }

  let policy: PayrollParticipationPolicy

  if (entryInside && exitInside) {
    policy = 'prorate_bounded_window'
  } else if (entryInside) {
    policy = 'prorate_from_start'
  } else {
    policy = 'prorate_until_end'
  }

  return {
    memberId,
    periodStart,
    periodEnd,
    eligibleFrom,
    eligibleTo,
    policy,
    reasonCodes,
    prorationFactor,
    prorationBasis: 'weekdays',
    exitEligibility,
    warnings
  }
}

// ----- helpers (pure, module-private) -----

type ExcludeArgs = {
  memberId: string
  periodStart: string
  periodEnd: string
  reasonCodes: readonly PayrollParticipationReasonCode[]
  exitEligibility: PayrollParticipationWindow['exitEligibility']
  warnings: readonly PayrollParticipationWarning[]
}

const buildExcludeWindow = (args: ExcludeArgs): PayrollParticipationWindow => ({
  memberId: args.memberId,
  periodStart: args.periodStart,
  periodEnd: args.periodEnd,
  eligibleFrom: null,
  eligibleTo: null,
  policy: 'exclude',
  reasonCodes: args.reasonCodes,
  prorationFactor: 0,
  prorationBasis: 'weekdays',
  exitEligibility: args.exitEligibility,
  warnings: args.warnings
})

const resolveExitReasonCode = (
  exit: NonNullable<PayrollParticipationFacts['exitEligibility']>
): PayrollParticipationReasonCode => {
  if (exit.projectionPolicy === 'exclude_from_cutoff' || exit.exitLane === 'external_payroll') {
    return 'external_payroll_exit'
  }

  if (exit.projectionPolicy === 'exclude_entire_period') {
    return 'relationship_ended'
  }

  return 'exit_mid_period'
}

const maxDate = (a: string, b: string): string => (a >= b ? a : b)

const minDate = (...dates: string[]): string => dates.reduce((acc, d) => (d < acc ? d : acc))

const daysBetween = (a: string, b: string): number => {
  const ms = new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime()

  
return Math.round(ms / (1000 * 60 * 60 * 24))
}

const datesDifferByMoreThanDays = (a: string, b: string, threshold: number): boolean =>
  Math.abs(daysBetween(a, b)) > threshold
