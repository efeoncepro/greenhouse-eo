import { describe, expect, it } from 'vitest'

import { assertOnboardingTransition, isTerminalOnboardingStatus } from './state-machine'
import type { WorkRelationshipOnboardingCase } from './types'

const baseCase: WorkRelationshipOnboardingCase = {
  onboardingCaseId: 'case-1',
  publicId: 'EO-ON-2026-ABC12345',
  profileId: 'profile-1',
  memberId: 'member-1',
  userId: 'user-1',
  personLegalEntityRelationshipId: 'rel-1',
  legalEntityOrganizationId: 'org-legal',
  organizationId: 'org-legal',
  spaceId: 'space-1',
  relationshipType: 'employee',
  employmentType: 'employee',
  contractTypeSnapshot: 'indefinido',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  startType: 'new_hire',
  source: 'manual_hr',
  status: 'approved',
  ruleLane: 'internal_payroll',
  requiresIdentityProvisioning: true,
  requiresApplicationAccess: true,
  requiresPayrollReadiness: true,
  requiresLeavePolicyBootstrap: true,
  requiresHrDocuments: true,
  requiresAssignmentBootstrap: true,
  requiresManagerAssignment: true,
  requiresEquipmentOrAccessSetup: true,
  greenhouseExecutionMode: 'full',
  startDate: '2026-05-14',
  firstWorkingDay: '2026-05-14',
  submittedAt: null,
  approvedAt: null,
  scheduledAt: null,
  activatedAt: null,
  cancelledAt: null,
  blockedReason: null,
  managerMemberId: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z'
}

describe('onboarding state machine', () => {
  it('allows approved onboarding to activate with a start date', () => {
    expect(() => assertOnboardingTransition(baseCase, { status: 'active' })).not.toThrow()
  })

  it('requires blocked reason when blocking', () => {
    expect(() => assertOnboardingTransition(baseCase, { status: 'blocked' })).toThrow(/blockedReason/)
  })

  it('treats active and cancelled as terminal', () => {
    expect(isTerminalOnboardingStatus('active')).toBe(true)
    expect(isTerminalOnboardingStatus('cancelled')).toBe(true)
    expect(isTerminalOnboardingStatus('approved')).toBe(false)
  })
})
