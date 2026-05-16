/**
 * Pure-function policy resolver for Leave Accrual Eligibility.
 *
 * NEVER does IO. Tested in isolation with synthetic facts. The bulk resolver
 * (`resolver.ts`) hydrates real facts from PG then feeds them here.
 *
 * Algorithm canonical (ADR Delta 2026-05-16 §"Leave Accrual
 * Participation-Aware"):
 *
 * 1. Year bounds: `[yearStart, yearEnd]`.
 * 2. Filter compensation facts to "dependent CL":
 *    `contract_type IN ('indefinido','plazo_fijo') AND pay_regime='chile' AND
 *    payroll_via='internal'`.
 * 3. If no qualifying facts → `policy='no_dependent', eligibleDays=0`.
 * 4. For each qualifying version: compute interval
 *    `[max(effective_from, yearStart), min(effective_to ?? yearEnd, yearEnd)]`.
 *    Honor exit cutoff: if `exitEligibility.eligibleTo` is non-null AND less
 *    than `intervalEnd`, truncate the LAST overlapping interval to
 *    `exit.eligibleTo`. (Exit applies to the latest dependent stint; earlier
 *    stints are not affected by a later exit because the contract changed
 *    before.)
 * 5. Sum days across non-overlapping intervals → `eligibleDays`.
 * 6. `firstDependentEffectiveFrom = min(effective_from)` of qualifying facts
 *    (clamped to `yearStart` if earlier).
 * 7. `firstServiceCycleDays`: canonical legacy denominator preserved.
 *    Computed as `daysBetween(firstDependentEffectiveFrom,
 *    addUtcDays(addUtcYears(firstDependentEffectiveFrom, 1), -1)) + 1`.
 * 8. Determine `policy`:
 *    - `no_dependent`           if eligibleDays === 0
 *    - `full_year_dependent`    if eligibleDays === (yearLength) AND no
 *                                non-dependent gaps observed
 *    - `partial_dependent`      otherwise
 * 9. Determine `reasonCodes` by inspecting transitions across version
 *    boundaries (contract_type change detection).
 */

import type {
  LeaveAccrualCompensationFact,
  LeaveAccrualEligibilityWindow,
  LeaveAccrualPolicy,
  LeaveAccrualReasonCode,
  LeaveAccrualWarning,
  LeaveAccrualWarningCode
} from './types'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const parseDate = (value: string): Date => {
  const match = DATE_PATTERN.exec(value)

  if (!match) {
    throw new Error(`invalid ISO date: ${value}`)
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10) - 1
  const day = Number.parseInt(match[3], 10)

  return new Date(Date.UTC(year, month, day))
}

const formatDate = (date: Date): string => {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

const addDays = (value: string, days: number): string => {
  const date = parseDate(value)

  date.setUTCDate(date.getUTCDate() + days)

  return formatDate(date)
}

const addYears = (value: string, years: number): string => {
  const date = parseDate(value)

  date.setUTCFullYear(date.getUTCFullYear() + years)

  return formatDate(date)
}

const daysBetween = (fromInclusive: string, toInclusive: string): number => {
  if (toInclusive < fromInclusive) return 0

  const from = parseDate(fromInclusive).getTime()
  const to = parseDate(toInclusive).getTime()
  const diffMs = to - from
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  return diffDays + 1
}

const maxDate = (a: string, b: string): string => (a >= b ? a : b)
const minDate = (a: string, b: string): string => (a <= b ? a : b)

const DEPENDENT_CONTRACT_TYPES = new Set<string>(['indefinido', 'plazo_fijo'])

const isQualifyingDependentCL = (fact: LeaveAccrualCompensationFact): boolean =>
  DEPENDENT_CONTRACT_TYPES.has(fact.contractType) &&
  fact.payRegime === 'chile' &&
  (fact.payrollVia ?? 'internal') === 'internal'

const isYearLeap = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const yearLength = (year: number): number => (isYearLeap(year) ? 366 : 365)

/**
 * Pure policy resolver. Takes compensation facts already fetched for the
 * member overlapping the year + the (optional) TASK-890 exit eligibility for
 * the same year window, and computes the canonical
 * `LeaveAccrualEligibilityWindow`.
 *
 * The function NEVER throws — invalid input degrades to `policy='unknown'`
 * with `degradedMode=true`. Consumers fall back to legacy `hire_date` accrual.
 */
export const deriveLeaveAccrualPolicy = ({
  memberId,
  year,
  facts,
  exitEligibility,
  warnings = [],
  asOfDate
}: {
  memberId: string
  year: number
  facts: ReadonlyArray<LeaveAccrualCompensationFact>
  exitEligibility: WorkforceExitPayrollEligibilityWindow | null
  warnings?: ReadonlyArray<LeaveAccrualWarning>
  /**
   * Optional clamp date for `eligibleDays` accrual. Mirrors the legacy
   * `calculateAccruedLeaveAllowanceDays.asOfDate` semantic: when computing the
   * CURRENT-year balance, we do NOT accrue future days (no anticipated
   * vacation). When omitted, defaults to `yearEnd` (full-year accrual,
   * appropriate for past-year retroactive balances).
   */
  asOfDate?: string
}): LeaveAccrualEligibilityWindow => {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    return degraded(memberId, year, 'compensation_query_failed', [...warnings])
  }

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  /*
   * Effective upper bound for accrual: clamp to asOfDate when in-year, else
   * yearEnd. Mirrors legacy semantic. Out-of-year asOfDate (past or future)
   * collapses to the canonical year bound.
   */
  const effectiveAsOfDate =
    asOfDate && asOfDate >= yearStart && asOfDate <= yearEnd ? asOfDate : yearEnd

  /*
   * Sort facts by effective_from ASC (defense in depth — query already sorts).
   * Detect transitions across consecutive versions for reason codes.
   */
  const sortedFacts = [...facts].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))

  const qualifying = sortedFacts.filter(isQualifyingDependentCL)

  /*
   * Detect transition reasons by walking consecutive facts. We compare each
   * pair (i, i+1) and emit transition codes when dependent ↔ non-dependent
   * crossings happen inside the year boundaries.
   */
  const reasonCodes = new Set<LeaveAccrualReasonCode>()

  for (let i = 0; i < sortedFacts.length - 1; i += 1) {
    const prev = sortedFacts[i]
    const next = sortedFacts[i + 1]
    const prevIsDep = isQualifyingDependentCL(prev)
    const nextIsDep = isQualifyingDependentCL(next)

    if (next.effectiveFrom < yearStart || next.effectiveFrom > yearEnd) continue

    if (!prevIsDep && nextIsDep) {
      reasonCodes.add('contractor_to_dependent_transition')
    } else if (prevIsDep && !nextIsDep) {
      reasonCodes.add('dependent_to_contractor_transition')
    }
  }

  if (qualifying.length === 0) {
    reasonCodes.add('no_qualifying_versions')

    return {
      memberId,
      year,
      eligibleDays: 0,
      firstDependentEffectiveFrom: null,
      firstServiceCycleDays: yearLength(year),
      policy: 'no_dependent',
      reasonCodes: Array.from(reasonCodes),
      degradedMode: false,
      lastObservedExitEligibility: exitEligibility,
      warnings: [...warnings]
    }
  }

  /*
   * Detect mid-year entry as dependent (hired_mid_year_dependent reason code):
   * earliest qualifying effective_from > yearStart.
   */
  const firstQualifying = qualifying[0]

  if (firstQualifying.effectiveFrom > yearStart) {
    reasonCodes.add('hired_mid_year_dependent')
  }

  /*
   * Walk qualifying intervals + sum eligibleDays.
   *
   * Exit truncation rule (ADR canonical): if `exitEligibility.eligibleTo` is
   * non-null AND less than yearEnd, truncate the LAST qualifying interval to
   * `eligibleTo`. Earlier intervals are not affected (exit applies forward
   * only; if there's a re-hire after the exit, that's a new version row).
   *
   * `lane` semantic (TASK-890): exit truncates regardless of lane — if the
   * cutoff is BEFORE yearEnd, those days are not Greenhouse-paid as dependent.
   * For `lane='internal_payroll'`, cutoff = last working day (finiquito). For
   * `lane='external_payroll'`/`non_payroll`, cutoff = effective_date. Both
   * are valid truncation points for accrual purposes (no dependent vínculo
   * post-cutoff).
   */
  const intervals: { start: string; end: string }[] = []
  let exitTruncatesInsideYear = false

  for (let i = 0; i < qualifying.length; i += 1) {
    const fact = qualifying[i]
    const intervalStart = maxDate(fact.effectiveFrom, yearStart)
    let intervalEnd = minDate(fact.effectiveTo ?? yearEnd, yearEnd)

    /* Truncate last interval by exit eligibility cutoff if applicable. */
    const isLastQualifying = i === qualifying.length - 1

    if (isLastQualifying && exitEligibility?.eligibleTo) {
      const cutoff = exitEligibility.eligibleTo
      const cutoffWithinYear = cutoff >= yearStart && cutoff <= yearEnd

      if (cutoffWithinYear && cutoff < intervalEnd) {
        intervalEnd = cutoff
        exitTruncatesInsideYear = true
      }
    }

    /*
     * Apply asOfDate clamp (legacy parity): no anticipated accrual beyond
     * today. effectiveAsOfDate is already clamped to year bounds above.
     */
    if (effectiveAsOfDate < intervalEnd) {
      intervalEnd = effectiveAsOfDate
    }

    if (intervalEnd >= intervalStart) {
      intervals.push({ start: intervalStart, end: intervalEnd })
    }
  }

  if (exitTruncatesInsideYear) {
    /*
     * Distinguish lane in reason code. Per TASK-890 canonical:
     *   - internal_payroll lane: greenhouse paga hasta executed → "exited mid"
     *   - external_payroll/non_payroll: exclude from cutoff → "external truncates"
     */
    const lane = exitEligibility?.exitLane

    if (lane === 'internal_payroll' || lane === 'relationship_transition') {
      reasonCodes.add('exited_mid_year_internal_payroll')
    } else {
      reasonCodes.add('external_payroll_exit_truncates')
    }
  }

  /* Detect gaps between consecutive qualifying intervals = compensation_version_gap */
  for (let i = 0; i < intervals.length - 1; i += 1) {
    const gap = parseDate(intervals[i + 1].start).getTime() - parseDate(intervals[i].end).getTime()
    const gapDays = Math.round(gap / (1000 * 60 * 60 * 24))

    if (gapDays > 1) {
      reasonCodes.add('compensation_version_gap')
    }
  }

  const eligibleDays = intervals.reduce(
    (sum, interval) => sum + daysBetween(interval.start, interval.end),
    0
  )

  /*
   * Canonical denominator: legacy `calculateAccruedLeaveAllowanceDays` uses
   * `getCalendarDayDiff(hireDate, firstServiceCycleEnd) + 1` where
   * `firstServiceCycleEnd = addUtcDays(addUtcYears(hireDate, 1), -1)`. We
   * preserve the same formula but anchor it at the first DEPENDENT effective
   * date (NOT hire_date legacy) — that's the canonical participation-aware
   * change.
   */
  const firstDependentEffectiveFrom = firstQualifying.effectiveFrom
  const firstServiceCycleEnd = addDays(addYears(firstDependentEffectiveFrom, 1), -1)
  const firstServiceCycleDays = daysBetween(firstDependentEffectiveFrom, firstServiceCycleEnd)

  /*
   * Final policy decision.
   */
  let policy: LeaveAccrualPolicy

  if (eligibleDays === 0) {
    policy = 'no_dependent'
  } else if (
    eligibleDays === daysBetween(yearStart, effectiveAsOfDate) &&
    effectiveAsOfDate === yearEnd &&
    reasonCodes.size === 0 &&
    firstQualifying.effectiveFrom <= yearStart
  ) {
    policy = 'full_year_dependent'
    reasonCodes.add('dependent_full_year')
  } else {
    policy = 'partial_dependent'
  }

  return {
    memberId,
    year,
    eligibleDays,
    firstDependentEffectiveFrom,
    firstServiceCycleDays,
    policy,
    reasonCodes: Array.from(reasonCodes),
    degradedMode: false,
    lastObservedExitEligibility: exitEligibility,
    warnings: [...warnings]
  }
}

const degraded = (
  memberId: string,
  year: number,
  reason: LeaveAccrualEligibilityWindow['degradedReason'],
  warnings: LeaveAccrualWarning[]
): LeaveAccrualEligibilityWindow => ({
  memberId,
  year,
  eligibleDays: 0,
  firstDependentEffectiveFrom: null,
  firstServiceCycleDays: 365,
  policy: 'unknown',
  reasonCodes: [],
  degradedMode: true,
  degradedReason: reason,
  lastObservedExitEligibility: null,
  warnings
})

/**
 * Exported helper used by the resolver wrapper to build a degraded window
 * when participation/exit flags are OFF or PG queries fail.
 */
export const buildDegradedLeaveAccrualWindow = ({
  memberId,
  year,
  reason,
  warningCode,
  warningSeverity = 'warning',
  warningEvidence
}: {
  memberId: string
  year: number
  reason: NonNullable<LeaveAccrualEligibilityWindow['degradedReason']>
  warningCode: LeaveAccrualWarningCode
  warningSeverity?: LeaveAccrualWarning['severity']
  warningEvidence?: Record<string, unknown>
}): LeaveAccrualEligibilityWindow =>
  degraded(memberId, year, reason, [
    {
      code: warningCode,
      severity: warningSeverity,
      messageKey: `leave.participation.${warningCode}`,
      evidence: warningEvidence
    }
  ])
