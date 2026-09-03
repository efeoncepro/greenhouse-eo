import { describe, expect, it } from 'vitest'

import { collectUnresolvedExitMemberIds, evaluateExitReviewGate } from './calculation-gate'
import type { WorkforceExitPayrollEligibilityWindow } from './types'

const window = (memberId: string, reviewRequired: boolean): WorkforceExitPayrollEligibilityWindow => ({
  memberId,
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  eligibleFrom: '2026-09-01',
  eligibleTo: '2026-09-30',
  relationshipStatus: 'active',
  exitCaseId: reviewRequired ? 'case-1' : null,
  exitCasePublicId: null,
  exitLane: reviewRequired ? 'identity_only' : null,
  exitStatus: reviewRequired ? 'blocked' : null,
  projectionPolicy: 'full_period',
  cutoffDate: null,
  reviewRequired,
  warnings: []
})

describe('TASK-1349 exit review gate (pure)', () => {
  it('collects only the members whose window demands review', () => {
    expect(collectUnresolvedExitMemberIds([window('a', false), window('b', true), window('c', true)])).toEqual(['b', 'c'])
  })

  it('reports unavailable when the resolver produced no windows (fail closed, never silent inclusion)', () => {
    expect(evaluateExitReviewGate(null)).toEqual({ unresolvedExitMemberIds: [], unavailable: true })
  })

  it('reports a clean gate when every window is resolved', () => {
    const windows = new Map([['a', window('a', false)]])

    expect(evaluateExitReviewGate(windows)).toEqual({ unresolvedExitMemberIds: [], unavailable: false })
  })
})
