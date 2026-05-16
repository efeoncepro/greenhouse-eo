import 'server-only'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

/**
 * Leave Accrual Eligibility Window — canonical year-scope resolver types.
 *
 * Single source of truth: TASK-895 ADR (Leave Accrual Participation-Aware,
 * V1.1a follow-up of TASK-893 Payroll Participation Window).
 * Spec: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
 * (Delta 2026-05-16 §"Leave Accrual Participation-Aware").
 *
 * Semantic boundary:
 *
 * - Leave is the **year-scope aggregator** that composes Payroll Participation
 *   Window (TASK-893 month-scope) mes a mes del year.
 * - Payroll Participation Window is the **month-scope primitive**. Leave
 *   imports from `@/lib/payroll/participation-window`; the reverse direction is
 *   forbidden (DAG-leaf rule, arch-architect verdict 2026-05-16).
 * - Payroll does NOT know about feriado legal CL Art 67/68 CT; Leave does NOT
 *   recompute month-level eligibility.
 *
 * Consumer responsibilities:
 *
 * - Branch on `policy` (enum cerrado), NEVER recompute by summing months
 *   manually outside the resolver.
 * - Use `eligibleDays` and `firstServiceCycleDays` as inputs to the canonical
 *   accrual formula — NEVER reimplement the formula in consumers.
 * - Honor `degradedMode === true` by falling back to legacy `hire_date` accrual
 *   (zero-risk safety floor preserves CL legal minimum).
 *
 * NEVER consume these enums by string comparison outside the leave module. Use
 * the resolver helpers exported from `@/lib/leave/participation-window`.
 */

/**
 * Canonical year-scope policy decision contract.
 *
 * - `full_year_dependent`  — full year as CL dependent (Art 67 floor applies).
 *                            No transition events in the year.
 * - `partial_dependent`    — at least one period of the year as CL dependent,
 *                            but NOT the full year. Includes:
 *                              - hired mid-year as dependent,
 *                              - exited mid-year via internal_payroll lane,
 *                              - contractor↔dependent transitions,
 *                              - any compensation_version gap inside the year.
 * - `no_dependent`         — zero dependent CL exposure in the year (the
 *                            member was only contractor / honorarios /
 *                            international / Deel during the year).
 * - `unknown`              — degraded mode; resolver could not determine the
 *                            window. Consumer MUST fall back to legacy
 *                            `hire_date`-based accrual.
 */
export type LeaveAccrualPolicy =
  | 'full_year_dependent'
  | 'partial_dependent'
  | 'no_dependent'
  | 'unknown'

/**
 * Reason codes ADD information NOT derivable from `policy` alone. They are
 * forensic / observability / operator-visible copy. NEVER branch consumer
 * accrual logic on reason codes — only on `policy`.
 *
 * - `dependent_full_year`               → policy `full_year_dependent` only
 * - `hired_mid_year_dependent`          → entry mid-year as dependent
 * - `exited_mid_year_internal_payroll`  → exit via internal_payroll lane
 * - `contractor_to_dependent_transition`→ contract type switched mid-year
 * - `dependent_to_contractor_transition`→ contract type switched mid-year
 * - `external_payroll_exit_truncates`   → TASK-890 lane=external_payroll/
 *                                          non_payroll cut eligibility before
 *                                          year_end
 * - `no_qualifying_versions`            → policy `no_dependent` only
 * - `compensation_version_gap`          → period(s) inside the year with no
 *                                          version applicable (data quality)
 */
export type LeaveAccrualReasonCode =
  | 'dependent_full_year'
  | 'hired_mid_year_dependent'
  | 'exited_mid_year_internal_payroll'
  | 'contractor_to_dependent_transition'
  | 'dependent_to_contractor_transition'
  | 'external_payroll_exit_truncates'
  | 'no_qualifying_versions'
  | 'compensation_version_gap'

/**
 * Warning codes emitted by the resolver to signal degraded composition or
 * data-quality drift. Operators see these via `warnings[]` in the audit script
 * output; Sentry receives them via `captureWithDomain('hr', ...)` when
 * severity warrants. NEVER consume `warnings` as part of accrual logic — they
 * are observability-only.
 */
export type LeaveAccrualWarningCode =
  | 'participation_resolver_disabled' /* TASK-893 flag OFF; resolver bypassed, legacy used */
  | 'participation_resolver_failed' /* TASK-893 query threw; fallback to legacy */
  | 'exit_resolver_disabled' /* TASK-890 flag OFF; exit truncation degraded */
  | 'compensation_query_failed' /* PG query for compensation_versions threw */
  | 'multiple_active_versions_overlap' /* >1 dependent version overlaps same window — data quality flag */

export type LeaveAccrualWarning = {
  code: LeaveAccrualWarningCode
  severity: 'info' | 'warning' | 'blocking'
  messageKey: string
  evidence?: Record<string, unknown>
}

/**
 * Canonical year-scope accrual eligibility window per member per year.
 *
 * Shape contract:
 *
 * - `eligibleDays` is the **sum of calendar days** across all
 *   compensation_version intervals in the year where:
 *   1. `contract_type IN ('indefinido', 'plazo_fijo')`,
 *   2. `pay_regime = 'chile'`,
 *   3. `payroll_via = 'internal'`,
 *   4. truncated by TASK-890 exit cutoff when `rule_lane != 'internal_payroll'`.
 * - `firstServiceCycleDays` is the **denominator** of the canonical legacy
 *   formula `(annualDays × overlapDays) / firstServiceCycleDays`. The
 *   participation-aware integration preserves this denominator semantics so
 *   migration is mathematically smooth: when `eligibleDays === overlapDays`
 *   (legacy continuous interval), `accrualDays` matches legacy bit-for-bit.
 * - `firstDependentEffectiveFrom` is the earliest `effective_from` of any
 *   qualifying dependent CL version overlapping the year. `null` when
 *   `policy === 'no_dependent'`.
 */
export type LeaveAccrualEligibilityWindow = {
  memberId: string
  year: number

  /**
   * Sum of calendar days across qualifying dependent CL intervals in the year,
   * truncated by exit cutoff when applicable.
   */
  eligibleDays: number

  /**
   * Earliest `effective_from` across qualifying dependent CL versions
   * overlapping the year. `null` when no qualifying versions.
   */
  firstDependentEffectiveFrom: string | null

  /**
   * Denominator for canonical accrual formula. For Art 67 CT first cycle:
   * `addUtcDays(firstDependentEffectiveFrom + 1y, -1) - firstDependentEffectiveFrom + 1`.
   * For full year post-anniversary (already settled), equal to `eligibleDays`.
   *
   * Consumer formula:
   *   `accrualDays = (policy.annualDays * eligibleDays) / firstServiceCycleDays`
   * (matches legacy `calculateAccruedLeaveAllowanceDays` numerator/denominator
   * exactly when `policy === 'full_year_dependent'` with no transitions).
   */
  firstServiceCycleDays: number

  policy: LeaveAccrualPolicy
  reasonCodes: readonly LeaveAccrualReasonCode[]

  /**
   * Degraded mode signals the resolver could NOT determine the window
   * reliably. Consumers MUST fall back to legacy `hire_date`-based accrual
   * (zero-risk safety floor preserving CL legal minimum).
   */
  degradedMode: boolean
  degradedReason?:
    | 'participation_resolver_disabled'
    | 'participation_resolver_failed'
    | 'compensation_query_failed'
    | 'no_compensation_versions'

  /**
   * Optional TASK-890 exit eligibility from the LAST month of the year, kept
   * for observability when the exit truncates accrual. NEVER use this to
   * recompute eligibility — `eligibleDays` already absorbed the cutoff.
   */
  lastObservedExitEligibility: WorkforceExitPayrollEligibilityWindow | null

  warnings: readonly LeaveAccrualWarning[]
}

/**
 * Input row from the canonical compensation_versions bulk query. One row per
 * (member_id, version) overlapping the year. Resolver groups and reduces.
 */
export type LeaveAccrualCompensationFact = {
  memberId: string
  versionId: string
  effectiveFrom: string /* ISO YYYY-MM-DD */
  effectiveTo: string | null /* ISO YYYY-MM-DD, null = open-ended */
  contractType: string
  payRegime: string
  payrollVia: string | null
}
