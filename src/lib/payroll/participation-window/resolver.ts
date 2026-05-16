import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveExitEligibilityForMembers } from '@/lib/payroll/exit-eligibility'
import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import { isPayrollParticipationWindowEnabled } from './flag'
import { derivePayrollParticipationPolicy } from './policy'
import { fetchParticipationFactsForMembers } from './query'
import type { PayrollParticipationFacts, PayrollParticipationWindow } from './types'

/**
 * **Canonical bulk resolver** for the Payroll Participation Window.
 *
 * Composes:
 *
 * 1. Participation FACTS (compensation bounds + onboarding start_date) via
 *    `fetchParticipationFactsForMembers`. Members without an applicable
 *    compensation are silently absent from the result map (consumers MUST
 *    branch on `.has(memberId)`, not on a placeholder window).
 * 2. **Explicit** invocation of `resolveExitEligibilityForMembers` (TASK-890).
 *    NEVER reads `exitEligibilityWindow` already attached by
 *    `pgGetApplicableCompensationVersionsForPeriod` — that attachment is
 *    itself gated by the TASK-890 flag, and the participation resolver
 *    needs a fresh exit decision regardless of the call site.
 * 3. Pure-function `derivePayrollParticipationPolicy(facts)` per member.
 *
 * **Degradation contracts**:
 *
 * - TASK-890 throws (DB transient, schema drift) → `captureWithDomain('payroll', err, ...)`
 *   + every member gets a `exit_resolver_failed` warning + `exitEligibility = null`.
 *   Resolver does NOT throw — payroll proyectada keeps rendering with
 *   entry-side prorated correctly and the operator sees the warning in UI.
 *
 * - TASK-890 returns Map but a specific member is missing → treat that
 *   member's exit as `null` (no offboarding case → fully active by default).
 *   No warning emitted (the absence IS the signal that no exit applies).
 *
 * - Members without facts (no compensation overlap) → silently absent from
 *   the output map. The consumer is responsible for skipping them — which
 *   matches existing `pgGetApplicableCompensationVersionsForPeriod` behavior.
 *
 * **What this resolver does NOT do** (deliberately):
 *
 * - Does NOT throw on TASK-890 failure. Defensive degradation; payroll
 *   continues with entry-side correctness only.
 * - Does NOT invoke the participation flag check. Consumers (Slice 3-4)
 *   gate via `isPayrollParticipationWindowEnabled()` BEFORE calling this
 *   resolver. The resolver itself is always available for tests / scripts
 *   / future tooling.
 * - Does NOT mutate Postgres. Read-only.
 */
export const resolvePayrollParticipationWindowsForMembers = async (
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, PayrollParticipationWindow>> => {
  if (memberIds.length === 0) {
    return new Map()
  }

  const factsByMember = await fetchParticipationFactsForMembers(memberIds, periodStart, periodEnd)

  /*
   * Compose TASK-890 in parallel. Resolve to a Map even on failure so the
   * per-member loop below stays branch-free.
   */
  let exitByMember: Map<string, WorkforceExitPayrollEligibilityWindow> = new Map()
  let exitResolverFailureDetail: string | null = null

  try {
    exitByMember = await resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd)
  } catch (err) {
    exitResolverFailureDetail = err instanceof Error ? err.message : String(err)
    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'participation_window.exit_composition_failed',
        memberCount: memberIds.length,
        periodStart,
        periodEnd
      }
    })
  }

  const out = new Map<string, PayrollParticipationWindow>()

  for (const memberId of memberIds) {
    const facts = factsByMember.get(memberId)

    /*
     * Member absent from facts map = no applicable compensation → upstream
     * roster gate already excluded them. Silently skip; matches the contract
     * of `pgGetApplicableCompensationVersionsForPeriod`.
     */
    if (!facts) continue

    const exit = exitByMember.get(memberId) ?? null

    const factsInput: PayrollParticipationFacts = {
      memberId,
      periodStart,
      periodEnd,
      compensationEffectiveFrom: facts.compensationEffectiveFrom,
      compensationEffectiveTo: facts.compensationEffectiveTo,
      onboardingStartDate: facts.onboardingStartDate,
      exitEligibility: exit,
      exitResolverDegraded: exitResolverFailureDetail
        ? { reason: 'failed', detail: exitResolverFailureDetail }
        : undefined
    }

    out.set(memberId, derivePayrollParticipationPolicy(factsInput))
  }

  return out
}

/**
 * Thin predicate. Returns `true` when the member has any participation in
 * the date window (NOT excluded by policy).
 *
 * For bulk roster decisions, prefer `resolvePayrollParticipationWindowsForMembers`
 * directly to amortize the query.
 *
 * Use this for capability checks, drawer state, or single-member surfaces.
 */
export const isMemberParticipatingInPayroll = async (
  memberId: string,
  asOf: string
): Promise<boolean> => {
  const windows = await resolvePayrollParticipationWindowsForMembers([memberId], asOf, asOf)
  const window = windows.get(memberId)

  if (!window) return false

  return window.policy !== 'exclude'
}

/**
 * Re-exported here for ergonomic single-import callers (Slice 3 integration
 * reads the flag + calls the resolver from one module).
 */
export { isPayrollParticipationWindowEnabled }
