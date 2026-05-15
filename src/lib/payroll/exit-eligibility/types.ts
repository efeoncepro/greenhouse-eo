import 'server-only'

/**
 * Workforce Exit Payroll Eligibility Window — canonical resolver types.
 *
 * Single source of truth: TASK-890 ADR (GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md).
 *
 * NEVER consume these enums by string comparison in consumer code. Use the
 * resolver helpers (`resolveExitEligibilityForMembers`, `isMemberInPayrollScope`)
 * and rely on `projectionPolicy` for the decision.
 */

/**
 * Mirror 1:1 of `greenhouse_hr.work_relationship_offboarding_cases.rule_lane`
 * (DB-aligned). NO inventar un tercer enum; el UI display layer (`closureLane`
 * en `work-queue/derivation.ts`) es ortogonal.
 */
export type ExitLane =
  | 'internal_payroll'
  | 'external_payroll'
  | 'non_payroll'
  | 'identity_only'
  | 'relationship_transition'
  | 'unknown'

/**
 * Mirror 1:1 of `greenhouse_hr.work_relationship_offboarding_cases.status`.
 */
export type ExitStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'scheduled'
  | 'blocked'
  | 'executed'
  | 'cancelled'

/**
 * Inferred relationship status given the case lifecycle (NOT a persisted
 * column). Consumers use this for UI badges and copy.
 */
export type RelationshipStatus = 'active' | 'scheduled_exit' | 'ended' | 'unknown'

/**
 * Canonical decision contract. Consumers branch on this — NEVER on
 * `(lane, status, cutoff)` directly.
 *
 * - `full_period`             — proyectar mes completo
 * - `partial_until_cutoff`    — internal_payroll executed con cutoff en periodo → prorratear
 * - `exclude_from_cutoff`     — external_payroll/non_payroll approved+ con cutoff en periodo → excluir
 * - `exclude_entire_period`   — cutoff < periodStart en cualquier lane → fuera completo
 */
export type ProjectionPolicy =
  | 'full_period'
  | 'partial_until_cutoff'
  | 'exclude_from_cutoff'
  | 'exclude_entire_period'

export type ExitEligibilityWarningCode =
  | 'draft_case_with_cutoff_in_period'
  | 'comp_version_disagree_with_cutoff'
  | 'unclassified_lane'
  | 'missing_relationship'
  | 'effective_date_only_no_lwd'

export type ExitEligibilityWarning = {
  code: ExitEligibilityWarningCode
  severity: 'info' | 'warning' | 'blocking'
  messageKey: string
  evidence?: Record<string, unknown>
}

export type WorkforceExitPayrollEligibilityWindow = {
  memberId: string

  /** ISO date YYYY-MM-DD inclusive */
  periodStart: string

  /** ISO date YYYY-MM-DD inclusive */
  periodEnd: string

  /**
   * Effective eligibility intersected with [periodStart, periodEnd].
   * `null` en eligibleFrom = no elegible al inicio del periodo.
   * `null` en eligibleTo   = elegible hasta el fin del periodo.
   * Ambos `null` = excluded entire period.
   */
  eligibleFrom: string | null
  eligibleTo: string | null

  relationshipStatus: RelationshipStatus

  exitCaseId: string | null
  exitCasePublicId: string | null
  exitLane: ExitLane | null
  exitStatus: ExitStatus | null

  projectionPolicy: ProjectionPolicy

  /** Canonical cutoff = COALESCE(last_working_day, effective_date) */
  cutoffDate: string | null

  warnings: readonly ExitEligibilityWarning[]
}
