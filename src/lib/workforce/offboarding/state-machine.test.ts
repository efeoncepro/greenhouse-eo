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

describe('TASK-1349 — review guard and access-only fast track', () => {
  const scimStub: OffboardingCase = {
    ...baseCase,
    separationType: 'identity_only',
    source: 'scim',
    ruleLane: 'identity_only',
    greenhouseExecutionMode: 'informational',
    requiresPayrollClosure: false,
    status: 'needs_review',
    effectiveDate: '2026-06-10',
    lastWorkingDay: '2026-06-10',
    review: null
  }

  const reviewed = (decision: 'access_only' | 'relationship_ended'): OffboardingCase => ({
    ...scimStub,
    review: {
      decision,
      reviewedAt: '2026-09-03T15:00:00.000Z',
      reviewedByUserId: 'hr-1',
      reason: 'Revisado con People Ops.',
      previous: { separationType: 'identity_only', ruleLane: 'identity_only', status: 'needs_review', effectiveDate: null, lastWorkingDay: null }
    }
  })

  it('refuses to approve/schedule/execute an unreviewed access-signal case even with dates', () => {
    expect(() => assertOffboardingTransition(scimStub, { status: 'approved' })).toThrow(/revisión/)
    expect(() => assertOffboardingTransition({ ...scimStub, status: 'approved' }, { status: 'scheduled' })).toThrow(/revisión/)
  })

  it('still allows containment (blocked) and cancellation without a review', () => {
    expect(() => assertOffboardingTransition(scimStub, { status: 'blocked', blockedReason: 'Pendiente de clasificación' })).not.toThrow()
    expect(() => assertOffboardingTransition(scimStub, { status: 'cancelled' })).not.toThrow()
  })

  it('allows approval once reviewed', () => {
    expect(() => assertOffboardingTransition(reviewed('relationship_ended'), { status: 'approved' })).not.toThrow()
  })

  it('fast-tracks a reviewed access_only case straight to executed (informational close)', () => {
    expect(() => assertOffboardingTransition(reviewed('access_only'), { status: 'executed' })).not.toThrow()
    expect(() => assertOffboardingTransition({ ...reviewed('access_only'), status: 'blocked', blockedReason: 'x' }, { status: 'executed' })).not.toThrow()
  })

  it('does NOT fast-track a relationship_ended review — the labor lifecycle still applies', () => {
    expect(() => assertOffboardingTransition(reviewed('relationship_ended'), { status: 'executed' })).toThrow(/Invalid offboarding transition/)
  })
})
