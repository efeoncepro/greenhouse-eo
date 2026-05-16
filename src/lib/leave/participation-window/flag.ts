import 'server-only'

import { isPayrollExitEligibilityWindowEnabled } from '@/lib/payroll/exit-eligibility/flag'
import { isPayrollParticipationWindowEnabled } from '@/lib/payroll/participation-window/flag'

/**
 * Feature flag canonical: `LEAVE_PARTICIPATION_AWARE_ENABLED`.
 *
 * Default: `false` in every environment (production, staging, dev) until:
 * 1. Legal review + HR signoff written approval in `Handoff.md`,
 * 2. Staging shadow audit script (TASK-895 S4) reports 0 overshoot ≥30 days,
 * 3. Signal `hr.leave.accrual_overshoot_drift` count=0 sustained ≥30 days
 *    staging,
 * 4. TASK-893 `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND TASK-890
 *    `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` in the same environment.
 *
 * **Flag dependency** (ADR Hard Rule): `LEAVE_PARTICIPATION_AWARE_ENABLED=true`
 * REQUIRES both `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND
 * `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true`. Without those pre-conditions,
 * the resolver would compose a degraded exit decision and partial-correctness
 * accrual — the worst failure mode.
 *
 * The `isLeaveAccrualParticipationAwareEnabled` helper enforces the dependency
 * at the boundary: returns `true` ONLY when all three flags are ON. If
 * `LEAVE_PARTICIPATION_AWARE_ENABLED=true` but a parent flag is OFF, this
 * returns `false` (legacy bit-for-bit fallback) — operator-facing degradation
 * is honest.
 *
 * Mirror exact of `isPayrollParticipationWindowEnabled` (TASK-893) +
 * `isPayrollExitEligibilityWindowEnabled` (TASK-890).
 */

const isLeaveAccrualFlagRawOn = (): boolean =>
  process.env.LEAVE_PARTICIPATION_AWARE_ENABLED === 'true'

export const isLeaveAccrualParticipationAwareEnabled = (): boolean => {
  if (!isLeaveAccrualFlagRawOn()) {
    return false
  }

  /* Enforce flag dependency canonical: both parent flags MUST be ON. */
  if (!isPayrollParticipationWindowEnabled()) {
    return false
  }

  if (!isPayrollExitEligibilityWindowEnabled()) {
    return false
  }

  return true
}

/**
 * Reports which canonical pre-condition is missing for forensic diagnostics.
 * Returns `null` when the flag is fully eligible. Used by the resolver to emit
 * `participation_resolver_disabled` warnings with precise evidence.
 */
export const diagnoseLeaveAccrualFlagDependency = ():
  | null
  | 'leave_flag_off'
  | 'task_893_flag_off'
  | 'task_890_flag_off' => {
  if (!isLeaveAccrualFlagRawOn()) {
    return 'leave_flag_off'
  }

  if (!isPayrollParticipationWindowEnabled()) {
    return 'task_893_flag_off'
  }

  if (!isPayrollExitEligibilityWindowEnabled()) {
    return 'task_890_flag_off'
  }

  
return null
}
