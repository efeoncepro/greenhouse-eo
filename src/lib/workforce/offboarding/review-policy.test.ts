import { describe, expect, it } from 'vitest'

import { HrCoreValidationError } from '@/lib/hr-core/shared'

import { assertReviewVersionMatches, deriveOffboardingCaseReview, readOffboardingCaseReview } from './review-policy'
import type { OffboardingCase } from './types'

// Synthetic SCIM identity_only stub for an honorarios collaborator (Felipe-like, NOT Felipe's data).
const scimStub: OffboardingCase = {
  offboardingCaseId: 'offboarding-case-synthetic-1',
  publicId: 'EO-OFF-2026-SYNTH01',
  profileId: 'profile-synthetic-1',
  memberId: 'member-synthetic-1',
  userId: 'user-synthetic-1',
  personLegalEntityRelationshipId: 'pler-synthetic-1',
  legalEntityOrganizationId: 'org-1',
  organizationId: 'org-1',
  spaceId: 'space-1',
  relationshipType: 'contractor',
  employmentType: 'contractor',
  contractTypeSnapshot: 'honorarios',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'identity_only',
  source: 'scim',
  status: 'needs_review',
  ruleLane: 'identity_only',
  requiresPayrollClosure: false,
  requiresLeaveReconciliation: false,
  requiresHrDocuments: false,
  requiresAccessRevocation: true,
  requiresAssetRecovery: false,
  requiresAssignmentHandoff: false,
  requiresApprovalReassignment: false,
  greenhouseExecutionMode: 'informational',
  effectiveDate: null,
  lastWorkingDay: null,
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: '2026-06-10T13:37:47.322Z',
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
  createdByUserId: 'user-scim',
  updatedByUserId: 'user-scim',
  createdAt: '2026-06-10T13:37:47.322Z',
  updatedAt: '2026-06-10T13:37:47.322Z',
  review: null
}

const VERSION = scimStub.updatedAt
const REASON = 'Confirmado con People: dejó de prestar servicios el 2 de junio.'

const relationshipEnded = (overrides: Record<string, unknown> = {}) => ({
  decision: 'relationship_ended' as const,
  reason: REASON,
  expectedUpdatedAt: VERSION,
  separationType: 'contract_end' as const,
  effectiveDate: '2026-06-02',
  lastWorkingDay: '2026-06-02',
  ...overrides
})

const code = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof HrCoreValidationError) return `${error.statusCode}:${error.code}`
    throw error
  }

  return 'no_error'
}

describe('deriveOffboardingCaseReview — relationship_ended', () => {
  it('reclassifies a SCIM identity_only honorarios stub to non_payroll with explicit cause and dates, landing in needs_review', () => {
    const result = deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded(), actorUserId: 'hr-1', canApprove: true })

    expect(result.next.separationType).toBe('contract_end')
    expect(result.next.lane.ruleLane).toBe('non_payroll')
    expect(result.next.lane.greenhouseExecutionMode).toBe('partial')
    expect(result.next.effectiveDate).toBe('2026-06-02')
    expect(result.next.lastWorkingDay).toBe('2026-06-02')
    expect(result.next.status).toBe('needs_review')
    expect(result.review.decision).toBe('relationship_ended')
    expect(result.review.previous).toEqual({
      separationType: 'identity_only',
      ruleLane: 'identity_only',
      status: 'needs_review',
      effectiveDate: null,
      lastWorkingDay: null
    })
    expect(result.changes).toEqual(['separation_type', 'rule_lane', 'effective_date', 'last_working_day'])
    expect(result.approvalInvalidated).toBe(false)
  })

  it('never infers the cause: relationship_ended without separationType is rejected', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ separationType: null }), actorUserId: 'hr-1', canApprove: false }))).toBe(
      '400:offboarding_review_separation_type_required'
    )
  })

  it('rejects identity_only and relationship_transition as causes of a real termination', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ separationType: 'identity_only' }), actorUserId: 'hr-1', canApprove: false }))).toBe(
      '400:offboarding_review_separation_type_required'
    )
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ separationType: 'relationship_transition' }), actorUserId: 'hr-1', canApprove: false }))).toBe(
      '400:offboarding_review_separation_type_required'
    )
  })

  it('never assumes today: missing dates are rejected', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ effectiveDate: null }), actorUserId: 'hr-1', canApprove: false }))).toBe('400:offboarding_review_dates_required')
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ lastWorkingDay: null }), actorUserId: 'hr-1', canApprove: false }))).toBe('400:offboarding_review_dates_required')
  })

  it('honours approveNow only when the actor can approve', () => {
    const withoutPermission = deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ approveNow: true }), actorUserId: 'hr-1', canApprove: false })
    const withPermission = deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ approveNow: true }), actorUserId: 'hr-1', canApprove: true })

    expect(withoutPermission.next.status).toBe('needs_review')
    expect(withPermission.next.status).toBe('approved')
  })

  it('a material correction of an approved case invalidates the approval (back to needs_review)', () => {
    const approved: OffboardingCase = { ...scimStub, status: 'approved', effectiveDate: '2026-09-03', lastWorkingDay: '2026-09-03', approvedAt: '2026-09-03T14:09:46.924Z' }
    const result = deriveOffboardingCaseReview({ current: approved, input: relationshipEnded(), actorUserId: 'hr-1', canApprove: false })

    expect(result.next.status).toBe('needs_review')
    expect(result.approvalInvalidated).toBe(true)
    expect(result.changes).toContain('approval_invalidated')
  })

  it('a blocked case is unblocked by the correction', () => {
    const blocked: OffboardingCase = { ...scimStub, status: 'blocked', blockedReason: 'Corrección pendiente', effectiveDate: '2026-06-02', lastWorkingDay: '2026-06-02' }
    const result = deriveOffboardingCaseReview({ current: blocked, input: relationshipEnded(), actorUserId: 'hr-1', canApprove: false })

    expect(result.next.status).toBe('needs_review')
    expect(result.changes).toContain('unblocked')
    expect(result.changes).not.toContain('effective_date')
  })

  it('recomputes the lane from the case snapshots — an indefinido employee becomes internal_payroll (full)', () => {
    const employee: OffboardingCase = { ...scimStub, relationshipType: 'employee', contractTypeSnapshot: 'indefinido', payRegimeSnapshot: 'chile', payrollViaSnapshot: 'internal' }
    const result = deriveOffboardingCaseReview({ current: employee, input: relationshipEnded({ separationType: 'resignation' }), actorUserId: 'hr-1', canApprove: false })

    expect(result.next.lane.ruleLane).toBe('internal_payroll')
    expect(result.next.lane.requiresPayrollClosure).toBe(true)
    expect(result.next.lane.greenhouseExecutionMode).toBe('full')
  })
})

describe('deriveOffboardingCaseReview — access_only', () => {
  it('keeps identity_only lane/separation, records the access-revocation date and touches nothing labor-related', () => {
    const result = deriveOffboardingCaseReview({
      current: scimStub,
      input: { decision: 'access_only', reason: 'Cuenta deshabilitada por rotación de licencia; sigue prestando servicios.', expectedUpdatedAt: VERSION, effectiveDate: '2026-06-10' },
      actorUserId: 'hr-1',
      canApprove: true
    })

    expect(result.next.separationType).toBe('identity_only')
    expect(result.next.lane.ruleLane).toBe('identity_only')
    expect(result.next.lane.greenhouseExecutionMode).toBe('informational')
    expect(result.next.lane.requiresPayrollClosure).toBe(false)
    expect(result.next.effectiveDate).toBe('2026-06-10')
    expect(result.next.lastWorkingDay).toBe('2026-06-10')
    expect(result.next.status).toBe('needs_review')
    expect(result.review.decision).toBe('access_only')
  })

  it('still demands the explicit access-revocation date', () => {
    expect(
      code(() =>
        deriveOffboardingCaseReview({
          current: scimStub,
          input: { decision: 'access_only', reason: 'Cuenta deshabilitada por rotación de licencia.', expectedUpdatedAt: VERSION },
          actorUserId: 'hr-1',
          canApprove: true
        })
      )
    ).toBe('400:offboarding_review_dates_required')
  })
})

describe('deriveOffboardingCaseReview — guards', () => {
  it('rejects a stale version (409 conflict) and a missing version (400)', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ expectedUpdatedAt: '2026-06-09T00:00:00.000Z' }), actorUserId: 'hr-1', canApprove: false }))).toBe('409:offboarding_case_version_conflict')
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ expectedUpdatedAt: '' }), actorUserId: 'hr-1', canApprove: false }))).toBe('400:offboarding_case_version_required')
  })

  it('accepts the same instant in a different ISO representation', () => {
    expect(() => assertReviewVersionMatches({ updatedAt: '2026-06-10T13:37:47.322Z' }, '2026-06-10T10:37:47.322-03:00')).not.toThrow()
  })

  it('rejects a short reason and a terminal case', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ reason: 'ok' }), actorUserId: 'hr-1', canApprove: false }))).toBe('400:offboarding_review_reason_too_short')
    expect(code(() => deriveOffboardingCaseReview({ current: { ...scimStub, status: 'executed', executedAt: '2026-06-10T00:00:00.000Z' }, input: relationshipEnded(), actorUserId: 'hr-1', canApprove: false }))).toBe('409:offboarding_case_terminal')
  })

  it('rejects an LWD after the effective date without an explicit reason', () => {
    expect(code(() => deriveOffboardingCaseReview({ current: scimStub, input: relationshipEnded({ lastWorkingDay: '2026-06-05' }), actorUserId: 'hr-1', canApprove: false }))).toBe('400:offboarding_review_dates_inconsistent')
  })
})

describe('readOffboardingCaseReview', () => {
  it('never infers a review from malformed metadata', () => {
    expect(readOffboardingCaseReview({})).toBeNull()
    expect(readOffboardingCaseReview({ review: 'access_only' })).toBeNull()
    expect(readOffboardingCaseReview({ review: { decision: 'maybe' } })).toBeNull()
    expect(readOffboardingCaseReview({ review: { decision: 'access_only', reviewedAt: 'x', reviewedByUserId: 'u', reason: 'r', previous: {} } })?.decision).toBe('access_only')
  })
})
