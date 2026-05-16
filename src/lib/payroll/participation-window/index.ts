import 'server-only'

/**
 * Payroll Participation Window — canonical module barrel.
 *
 * TASK-893 V1 ships only the pure policy resolver (Slice 1). The bulk query
 * layer + composition with TASK-890 land in Slice 2; integration into
 * projected/official payroll lands in Slice 3-4 behind feature flag
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
