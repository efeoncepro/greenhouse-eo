import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import {
  isPayrollExitEligibilityWindowEnabled,
  resolveExitEligibilityForMembers
} from '@/lib/payroll/exit-eligibility'
import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

import { isPayrollParticipationWindowEnabled } from '@/lib/payroll/participation-window'

import {
  diagnoseLeaveAccrualFlagDependency,
  isLeaveAccrualParticipationAwareEnabled
} from './flag'
import { buildDegradedLeaveAccrualWindow, deriveLeaveAccrualPolicy } from './policy'
import { fetchCompensationFactsForLeaveAccrual } from './query'
import type {
  LeaveAccrualCompensationFact,
  LeaveAccrualEligibilityWindow,
  LeaveAccrualWarning
} from './types'

/**
 * **Canonical bulk resolver** for the Leave Accrual Eligibility Window.
 *
 * Year-scope aggregator that composes the month-scope Payroll Participation
 * Window primitive (TASK-893) + Workforce Exit Payroll Eligibility (TASK-890).
 *
 * Composes:
 *
 * 1. Compensation facts overlapping `[yearStart, yearEnd]` via
 *    `fetchCompensationFactsForLeaveAccrual`. Returns all version rows (NOT
 *    filtered to dependent CL — the policy resolver observes non-dependent
 *    rows for transition reason codes).
 *
 * 2. **Explicit** invocation of `resolveExitEligibilityForMembers` (TASK-890)
 *    for the year span. Honors the canonical flag dependency: TASK-895 ON
 *    requires TASK-890 ON. When TASK-890 flag is OFF, the resolver emits an
 *    `exit_resolver_disabled` warning so the operator surface flags degraded
 *    mode honestly.
 *
 * 3. Pure-function `deriveLeaveAccrualPolicy(facts)` per member.
 *
 * **Degradation contracts**:
 *
 * - Flag OFF (any of the 3 canonical flags): resolver returns a degraded
 *   window with `degradedMode=true` and reason
 *   `participation_resolver_disabled`. Consumers fall back to legacy accrual.
 *
 * - PG query throws: `captureWithDomain('hr', err, ...)` + degraded window
 *   per member with `participation_resolver_failed` reason. Consumers fall
 *   back to legacy.
 *
 * - TASK-890 throws (but participation query succeeded): degraded only the
 *   exit dimension; emit warning `exit_resolver_disabled`. Policy resolver
 *   still derives eligibility from compensation_versions alone (no exit
 *   truncation). Operator-facing warning surfaces in audit script S4.
 *
 * **What this resolver does NOT do** (deliberately):
 *
 * - Does NOT throw. Always returns a Map (possibly with degraded windows).
 *   Payroll/Leave never blocks on resolver failure.
 * - Does NOT mutate PG. Read-only.
 * - Does NOT consume the `LEAVE_PARTICIPATION_AWARE_ENABLED` flag at the
 *   boundary — that's the consumer's responsibility (Slice 2 integration).
 *   The resolver IS available even when the flag is OFF, so the audit script
 *   (Slice 4) can compute "what WOULD eligibility be" for shadow comparison.
 */
export const resolveLeaveAccrualWindowsForMembers = async (
  memberIds: ReadonlyArray<string>,
  year: number
): Promise<Map<string, LeaveAccrualEligibilityWindow>> => {
  if (memberIds.length === 0) {
    return new Map()
  }

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  let factsByMember: Map<string, ReadonlyArray<LeaveAccrualCompensationFact>> = new Map()
  let compensationQueryFailed = false

  try {
    factsByMember = await fetchCompensationFactsForLeaveAccrual(memberIds, yearStart, yearEnd)
  } catch (err) {
    compensationQueryFailed = true
    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'leave_participation_window.compensation_query_failed',
        memberCount: memberIds.length,
        year
      }
    })
  }

  if (compensationQueryFailed) {
    const degraded = new Map<string, LeaveAccrualEligibilityWindow>()

    for (const memberId of memberIds) {
      degraded.set(
        memberId,
        buildDegradedLeaveAccrualWindow({
          memberId,
          year,
          reason: 'compensation_query_failed',
          warningCode: 'compensation_query_failed',
          warningSeverity: 'warning'
        })
      )
    }

    return degraded
  }

  /*
   * Compose TASK-890 exit eligibility for the year span. Resolves to a Map
   * even on failure so the per-member loop below stays branch-free.
   */
  const exitResolverEnabled = isPayrollExitEligibilityWindowEnabled()
  let exitByMember: Map<string, WorkforceExitPayrollEligibilityWindow> = new Map()
  let exitResolverFailed = false

  try {
    exitByMember = await resolveExitEligibilityForMembers(memberIds, yearStart, yearEnd)
  } catch (err) {
    exitResolverFailed = true
    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'leave_participation_window.exit_resolver_failed',
        memberCount: memberIds.length,
        year
      }
    })
  }

  const out = new Map<string, LeaveAccrualEligibilityWindow>()

  for (const memberId of memberIds) {
    const facts = factsByMember.get(memberId) ?? []
    const exit = exitByMember.get(memberId) ?? null
    const warnings: LeaveAccrualWarning[] = []

    if (!exitResolverEnabled) {
      warnings.push({
        code: 'exit_resolver_disabled',
        severity: 'warning',
        messageKey: 'leave.participation.exit_resolver_disabled',
        evidence: { reason: 'task_890_flag_off' }
      })
    } else if (exitResolverFailed) {
      warnings.push({
        code: 'exit_resolver_disabled',
        severity: 'warning',
        messageKey: 'leave.participation.exit_resolver_failed'
      })
    }

    out.set(
      memberId,
      deriveLeaveAccrualPolicy({
        memberId,
        year,
        facts,
        exitEligibility: exitResolverFailed ? null : exit,
        warnings
      })
    )
  }

  return out
}

/**
 * Single-member convenience wrapper. Useful for the audit script (Slice 4)
 * and for individual-member surfaces.
 */
export const resolveLeaveAccrualWindowForMember = async (
  memberId: string,
  year: number
): Promise<LeaveAccrualEligibilityWindow> => {
  const map = await resolveLeaveAccrualWindowsForMembers([memberId], year)
  const window = map.get(memberId)

  if (!window) {
    /* Should not happen — bulk resolver returns degraded window for every memberId. */
    return buildDegradedLeaveAccrualWindow({
      memberId,
      year,
      reason: 'no_compensation_versions',
      warningCode: 'compensation_query_failed',
      warningSeverity: 'warning'
    })
  }

  return window
}

/* Re-exports for ergonomic single-import callers (integration Slice 2). */
export {
  isLeaveAccrualParticipationAwareEnabled,
  diagnoseLeaveAccrualFlagDependency,
  isPayrollParticipationWindowEnabled
}
