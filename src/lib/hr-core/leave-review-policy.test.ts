import { describe, expect, it } from 'vitest'

import type { HrLeaveRequest } from '@/types/hr-core'

import {
  canPerformLeaveReviewAction,
  getAllowedLeaveReviewActions,
  getLeaveReviewCapabilities
} from './leave-review-policy'

const baseRequest: HrLeaveRequest = {
  requestId: 'leave-1',
  memberId: 'daniela-ferreira',
  memberName: 'Daniela Ferreira',
  memberAvatarUrl: null,
  leaveTypeCode: 'medical',
  leaveTypeName: 'Permiso medico',
  startDate: '2026-04-17',
  endDate: '2026-04-17',
  startPeriod: 'morning',
  endPeriod: 'morning',
  requestedDays: 0.5,
  status: 'pending_supervisor',
  reason: 'Control',
  attachmentAssetId: null,
  attachmentUrl: null,
  supervisorMemberId: 'julio-reyes',
  supervisorName: 'Julio Reyes',
  approvalStageCode: 'supervisor_review',
  approvalSnapshot: {
    snapshotId: 'EO-APS-1',
    workflowDomain: 'leave',
    workflowEntityId: 'leave-1',
    stageCode: 'supervisor_review',
    subjectMemberId: 'daniela-ferreira',
    authoritySource: 'reporting_hierarchy',
    formalApproverMemberId: 'julio-reyes',
    formalApproverName: 'Julio Reyes',
    effectiveApproverMemberId: 'julio-reyes',
    effectiveApproverName: 'Julio Reyes',
    delegateMemberId: null,
    delegateMemberName: null,
    delegateResponsibilityId: null,
    fallbackRoleCodes: [],
    delegated: false,
    overrideActorUserId: null,
    overrideReason: null,
    snapshotPayload: {},
    createdByUserId: 'user-1',
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z'
  },
  hrReviewerUserId: null,
  decidedAt: null,
  decidedBy: null,
  notes: null,
  createdAt: '2026-04-15T00:00:00.000Z'
}

describe('leave review policy', () => {
  it('allows only cancel for the request owner on pending requests', () => {
    expect(getAllowedLeaveReviewActions({
      request: baseRequest,
      actor: { currentMemberId: 'daniela-ferreira', hasHrAdminAccess: false }
    })).toEqual(['cancel'])
  })

  it('allows supervisor reviewer to approve or reject, but not cancel', () => {
    const capabilities = getLeaveReviewCapabilities({
      request: baseRequest,
      actor: { currentMemberId: 'julio-reyes', hasHrAdminAccess: false }
    })

    expect(capabilities.canOpenReview).toBe(true)
    expect(capabilities.canApprove).toBe(true)
    expect(capabilities.canReject).toBe(true)
    expect(capabilities.canCancel).toBe(false)
  })

  it('allows HR admins to approve, reject, or cancel any pending request', () => {
    expect(getAllowedLeaveReviewActions({
      request: baseRequest,
      actor: { currentMemberId: null, hasHrAdminAccess: true }
    })).toEqual(['cancel', 'reject', 'approve'])
  })

  it('blocks review actions once the request is no longer pending', () => {
    const approvedRequest: HrLeaveRequest = { ...baseRequest, status: 'approved', approvalStageCode: null, approvalSnapshot: null }

    expect(getAllowedLeaveReviewActions({
      request: approvedRequest,
      actor: { currentMemberId: 'julio-reyes', hasHrAdminAccess: true }
    })).toEqual([])

    expect(canPerformLeaveReviewAction({
      request: approvedRequest,
      actor: { currentMemberId: 'julio-reyes', hasHrAdminAccess: true },
      action: 'approve'
    })).toBe(false)
  })
})
