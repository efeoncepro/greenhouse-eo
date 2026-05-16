import 'server-only'

/**
 * Payroll Participation Window — canonical module barrel.
 *
 * TASK-893 V1 ships the pure policy resolver (Slice 1) + bulk query layer +
 * composition with TASK-890 (Slice 2). Integration into projected/official
 * payroll lands in Slice 3-4 behind feature flag
 * `PAYROLL_PARTICIPATION_WINDOW_ENABLED` (default OFF).
 *
 * ADR: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`.
 */

export type {
  PayrollParticipationFacts,
  PayrollParticipationPolicy,
  PayrollParticipationReasonCode,
  PayrollParticipationWarning,
  PayrollParticipationWarningCode,
  PayrollParticipationWindow
} from './types'

export { derivePayrollParticipationPolicy } from './policy'
export { isPayrollParticipationWindowEnabled } from './flag'
export {
  resolvePayrollParticipationWindowsForMembers,
  isMemberParticipatingInPayroll
} from './resolver'
