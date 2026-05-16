import 'server-only'

/**
 * Feature flag canonical: `PAYROLL_PARTICIPATION_WINDOW_ENABLED`.
 *
 * Default: `false` in every environment (production, staging, dev) until
 * staging shadow compare validates the new semantic for ≥7 days steady AND
 * HR/Finance approves in writing.
 *
 * **Flag dependency** (ADR §"Flag Dependency"): `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true`
 * REQUIRES `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` in the same
 * environment. Without TASK-890 ON, the participation resolver composes a
 * degraded exit decision (`full_period` for everyone) and silently overpays
 * exiting collaborators while correctly prorating entering ones — the worst
 * failure mode (partial correctness without operator awareness).
 *
 * The resolver itself (Slice 2) emits a `exit_resolver_disabled` warning per
 * member with an active exit case in the period when TASK-890 is OFF — this
 * is the runtime detection. The flag-dependency rule itself is documented
 * here + in ADR Hard Rules + in CLAUDE.md (Slice 6).
 *
 * Mirror exact of `isPayrollExitEligibilityWindowEnabled` (TASK-890) +
 * `isPayrollWorkforceIntakeGateEnabled` (TASK-872).
 */
export const isPayrollParticipationWindowEnabled = (): boolean =>
  process.env.PAYROLL_PARTICIPATION_WINDOW_ENABLED === 'true'
