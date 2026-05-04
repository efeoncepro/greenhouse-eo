import { describe, expect, it } from 'vitest'

import { assertOffboardingTransition, isTerminalOffboardingStatus } from './state-machine'
import type { OffboardingCase } from './types'

const baseCase: OffboardingCase = {
  offboardingCaseId: 'offboarding-case-1',
  publicId: 'OFF-2026-000001',
  profileId: 'profile-1',
  memberId: 'member-1',
  userId: 'user-1',
  personLegalEntityRelationshipId: 'rel-1',
  legalEntityOrganizationId: 'org-1',
  organizationId: 'org-1',
  spaceId: 'space-1',
  relationshipType: 'employee',
  employmentType: 'full_time',
  contractTypeSnapshot: 'indefinido',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'resignation',
  source: 'manual_hr',
  status: 'needs_review',
  ruleLane: 'internal_payroll',
  requiresPayrollClosure: true,
  requiresLeaveReconciliation: true,
  requiresHrDocuments: true,
  requiresAccessRevocation: true,
  requiresAssetRecovery: true,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'full',
  effectiveDate: null,
  lastWorkingDay: null,
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: null,
  approvedAt: null,
  scheduledAt: null,
  executedAt: null,
  cancelledAt: null,
  blockedReason: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: 'user-1',
  updatedByUserId: 'user-1',
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z'
}

describe('assertOffboardingTransition', () => {
  it('requires the effective date before approval', () => {
    expect(() => assertOffboardingTransition(baseCase, { status: 'approved' })).toThrow(/effectiveDate/)
  })

  it('requires the last working day before scheduling', () => {
    expect(() =>
      assertOffboardingTransition(
        {
          ...baseCase,
          status: 'approved',
          effectiveDate: '2026-05-31'
        },
        { status: 'scheduled' }
      )
    ).toThrow(/lastWorkingDay/)
  })

  it('allows scheduling with canonical dates', () => {
    expect(() =>
      assertOffboardingTransition(
        {
          ...baseCase,
          status: 'approved',
          effectiveDate: '2026-05-31',
          lastWorkingDay: '2026-05-30'
        },
        { status: 'scheduled' }
      )
    ).not.toThrow()
  })

  it('requires explicit rationale when the last working day is after the effective date', () => {
    expect(() =>
      assertOffboardingTransition(
        {
          ...baseCase,
          status: 'approved',
          effectiveDate: '2026-05-31',
          lastWorkingDay: '2026-06-01'
        },
        { status: 'scheduled' }
      )
    ).toThrow(/lastWorkingDay/)
  })

  it('classifies executed and cancelled as terminal statuses', () => {
    expect(isTerminalOffboardingStatus('executed')).toBe(true)
    expect(isTerminalOffboardingStatus('cancelled')).toBe(true)
    expect(isTerminalOffboardingStatus('scheduled')).toBe(false)
  })
})
