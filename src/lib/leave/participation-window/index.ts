import 'server-only'

/**
 * Leave Accrual Participation-Aware — canonical barrel.
 *
 * Public API for TASK-895 (V1.1a follow-up of TASK-893 Payroll Participation
 * Window). Consumers MUST import only from this barrel — internal modules
 * (`types`, `flag`, `query`, `resolver`) are implementation details.
 *
 * Single source of truth: ADR in
 * `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
 * (Delta 2026-05-16 §"Leave Accrual Participation-Aware").
 */

export type {
  LeaveAccrualPolicy,
  LeaveAccrualReasonCode,
  LeaveAccrualWarningCode,
  LeaveAccrualWarning,
  LeaveAccrualEligibilityWindow,
  LeaveAccrualCompensationFact
} from './types'

export {
  isLeaveAccrualParticipationAwareEnabled,
  diagnoseLeaveAccrualFlagDependency
} from './flag'

/* Slice 1 will export resolver primitives:
 *
 *   - `resolveLeaveAccrualWindowForMember(memberId, year): Promise<LeaveAccrualEligibilityWindow>`
 *   - `deriveLeaveAccrualPolicy(facts): LeaveAccrualEligibilityWindow` (pure)
 */
