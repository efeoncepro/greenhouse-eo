import 'server-only'

import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

/**
 * Payroll Participation Window — canonical resolver types.
 *
 * Single source of truth: TASK-893 ADR
 * (`docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`).
 *
 * Consumer responsibilities:
 *
 * - Branch on `policy` (enum cerrado), NEVER on `reasonCodes` or by composing
 *   `eligibleFrom`/`eligibleTo` manually.
 * - Use `prorationFactor` directly — NEVER recompute via `countWeekdays` in
 *   consumer code.
 * - Read `exitEligibility` as the **embedded** TASK-890 decision; do NOT
 *   replicate the `(lane, status, cutoff)` matrix.
 * - Honor `warnings[]` (operator UI), especially `exit_resolver_disabled` and
 *   `exit_resolver_failed` — they signal degraded composition.
 *
 * NEVER consume these enums by string comparison in consumer code outside the
 * payroll module. Use the resolver helpers exported from
 * `@/lib/payroll/participation-window`.
 */

/**
 * Canonical policy decision contract. Consumers branch on this — NEVER on
 * `eligibleFrom`/`eligibleTo` directly nor on `reasonCodes`.
 *
 * - `exclude`                 — member out of payroll for this period; both
 *                               bounds null; `prorationFactor = 0`.
 * - `full_period`             — pay full period; bounds equal period; factor 1.
 * - `prorate_from_start`      — entry mid-period (Felipe-like); pay from
 *                               `eligibleFrom` to `periodEnd`.
 * - `prorate_until_end`       — exit mid-period (Maria-like internal); pay
 *                               from `periodStart` to `eligibleTo`.
 * - `prorate_bounded_window`  — entry AND exit inside the period; pay only
 *                               the bounded interval.
 */
export type PayrollParticipationPolicy =
  | 'exclude'
  | 'full_period'
  | 'prorate_from_start'
  | 'prorate_until_end'
  | 'prorate_bounded_window'

/**
 * Reason codes ADD information NOT derivable from `policy` alone. They are not
 * redundant with `policy`. Canonical matrix `policy × validReasonCodes`:
 *
 * - `exclude`                 → `compensation_not_effective` |
 *                               `relationship_not_started` | `relationship_ended` |
 *                               `external_payroll_exit`
 * - `full_period`             → `full_period`
 * - `prorate_from_start`      → `entry_mid_period`
 * - `prorate_until_end`       → `exit_mid_period` | `external_payroll_exit`
 * - `prorate_bounded_window`  → `entry_mid_period` + (`exit_mid_period` |
 *                               `external_payroll_exit`)
 *
 * Consumers branch on `policy`. Reason codes are forensic / observability /
 * operator-visible copy. NEVER branch consumer logic on reason codes.
 */
export type PayrollParticipationReasonCode =
  | 'compensation_not_effective'
  | 'entry_mid_period'
  | 'exit_mid_period'
  | 'external_payroll_exit'
  | 'relationship_not_started'
  | 'relationship_ended'
  | 'full_period'

/**
 * Warning codes emitted by the resolver to signal degraded composition or
 * data-quality drift. Operators see these via `warnings[]` in the surface;
 * Sentry receives them via `captureWithDomain('payroll', ...)` when severity
 * warrants. NEVER consume `warnings` as part of payroll calculation logic —
 * they are observability-only.
 */
export type PayrollParticipationWarningCode =
  | 'exit_resolver_disabled' /* TASK-890 flag OFF; exit decision degraded to legacy SQL gate */
  | 'exit_resolver_failed' /* TASK-890 query threw; falling back to compensation bounds only */
  | 'source_date_disagreement' /* comp.effective_from vs onboarding.start_date differ > 7 days; V1.1 data-driven trigger */
  | 'compensation_version_overlap' /* multiple comp versions span the period; V1 picks the active one only */

export type PayrollParticipationWarning = {
  code: PayrollParticipationWarningCode
  severity: 'info' | 'warning' | 'blocking'
  messageKey: string
  evidence?: Record<string, unknown>
}

/**
 * Canonical participation window decision per member per period.
 *
 * Shape contract (ADR Slice 1):
 *
 * - `exitEligibility` is **embedded**, not duplicated. TASK-890 stays single
 *   source of truth for exit semantics. `null` when no offboarding case
 *   applies OR when TASK-890 degraded (see `warnings`).
 * - `prorationFactor` is the composed factor in [0, 1] consumers multiply by
 *   monetary fields. Resolver computes it; consumers NEVER recompute.
 * - `prorationBasis` documents the calendar primitive used for the factor.
 *   V1 ships `weekdays`. Future `operational_calendar_chile` or
 *   `operational_calendar_country_*` extend without breaking consumers.
 */
export type PayrollParticipationWindow = {
  memberId: string

  /** ISO date YYYY-MM-DD inclusive */
  periodStart: string

  /** ISO date YYYY-MM-DD inclusive */
  periodEnd: string

  /**
   * Effective participation interval intersected with [periodStart, periodEnd].
   * `null` in `eligibleFrom` = not eligible at period start (excluded or
   * future entry). `null` in `eligibleTo` = eligible through period end.
   * Both `null` = excluded entire period.
   */
  eligibleFrom: string | null
  eligibleTo: string | null

  policy: PayrollParticipationPolicy
  reasonCodes: readonly PayrollParticipationReasonCode[]

  /**
   * Composed proration factor in [0, 1].
   *
   * Canonical formula:
   *
   *   participationFactor =
   *     countWeekdays(eligibleFrom, eligibleTo)
   *       / countWeekdays(periodStart, periodEnd)
   *
   * Consumers MAY further compose with mode-specific factors (e.g. projected
   * `actual_to_date`) externally — that composition lives at the consumer,
   * NOT inside the resolver. The resolver only knows participation.
   */
  prorationFactor: number

  /**
   * Calendar primitive used for the factor. V1 = `'weekdays'`. Future
   * `'operational_calendar_chile'` / `'operational_calendar_country_*'` extend
   * the union without breaking consumers (they keep multiplying by
   * `prorationFactor`).
   */
  prorationBasis: 'weekdays'

  /**
   * Embedded TASK-890 decision. NEVER replicate the `(lane, status, cutoff)`
   * matrix in callers. Read this struct or branch on `policy` above.
   *
   * `null` when no offboarding case applies (member fully active) OR when the
   * TASK-890 resolver degraded (see `warnings`).
   */
  exitEligibility: WorkforceExitPayrollEligibilityWindow | null

  warnings: readonly PayrollParticipationWarning[]
}

/**
 * Pure-function input shape for `derivePayrollParticipationPolicy`. Bulk
 * query layer (Slice 2) builds one of these per member, then feeds them to
 * the policy resolver.
 *
 * - `compensationEffectiveFrom` MUST be a non-null ISO date string. Members
 *   without a compensation version applicable to the period are excluded
 *   upstream by `pgGetApplicableCompensationVersionsForPeriod` — they never
 *   reach this resolver.
 * - `compensationEffectiveTo` is `null` when the compensation has no end
 *   date (open-ended contract).
 * - `onboardingStartDate` is observed-without-consumed in V1; the resolver
 *   uses it only to emit `source_date_disagreement` warnings (data-driven
 *   trigger for V1.1).
 * - `exitEligibility` is the TASK-890 resolver output; `null` when no
 *   offboarding case OR the resolver degraded.
 */
export type PayrollParticipationFacts = {
  memberId: string
  periodStart: string
  periodEnd: string
  compensationEffectiveFrom: string
  compensationEffectiveTo: string | null
  onboardingStartDate: string | null
  exitEligibility: WorkforceExitPayrollEligibilityWindow | null
  /** Set by the bulk-query layer (Slice 2) when TASK-890 was bypassed. */
  exitResolverDegraded?: {
    reason: 'disabled' | 'failed'
    detail?: string
  }
}
