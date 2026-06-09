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

// TASK-1020 — escenario regression Daniela/Valentina/Andrés (fixtures conceptuales,
// sin IDs vivos en runtime). Post-fix el snapshot resuelve effective == supervisor
// formal (Daniela); un delegado genérico (Valentina) NO puede aprobar.
describe('leave review policy — TASK-1020 delegation drift', () => {
  const andresRequest: HrLeaveRequest = {
    ...baseRequest,
    requestId: 'leave-andres',
    memberId: 'andres-carlosama',
    memberName: 'Andrés Carlosama',
    supervisorMemberId: 'daniela-ferreira',
    supervisorName: 'Daniela Ferreira',
    approvalSnapshot: {
      ...baseRequest.approvalSnapshot!,
      workflowEntityId: 'leave-andres',
      subjectMemberId: 'andres-carlosama',
      authoritySource: 'reporting_hierarchy',
      formalApproverMemberId: 'daniela-ferreira',
      formalApproverName: 'Daniela Ferreira',
      effectiveApproverMemberId: 'daniela-ferreira',
      effectiveApproverName: 'Daniela Ferreira',
      delegateMemberId: null,
      delegateResponsibilityId: null,
      delegated: false
    }
  }

  it('Daniela (formal supervisor) can approve/reject Andrés request', () => {
    const capabilities = getLeaveReviewCapabilities({
      request: andresRequest,
      actor: { currentMemberId: 'daniela-ferreira', hasHrAdminAccess: false }
    })

    expect(capabilities.canApprove).toBe(true)
    expect(capabilities.canReject).toBe(true)
    expect(capabilities.effectiveApproverMemberId).toBe('daniela-ferreira')
  })

  it('Valentina (generic delegate, not effective approver) cannot approve Andrés request', () => {
    expect(canPerformLeaveReviewAction({
      request: andresRequest,
      actor: { currentMemberId: 'valentina-hoyos', hasHrAdminAccess: false },
      action: 'approve'
    })).toBe(false)

    expect(getAllowedLeaveReviewActions({
      request: andresRequest,
      actor: { currentMemberId: 'valentina-hoyos', hasHrAdminAccess: false }
    })).toEqual([])
  })

  it('HR admin override still applies regardless of delegation', () => {
    expect(getAllowedLeaveReviewActions({
      request: andresRequest,
      actor: { currentMemberId: null, hasHrAdminAccess: true }
    })).toEqual(['cancel', 'reject', 'approve'])
  })

  it('an unrelated collaborator cannot approve', () => {
    expect(canPerformLeaveReviewAction({
      request: andresRequest,
      actor: { currentMemberId: 'someone-else', hasHrAdminAccess: false },
      action: 'approve'
    })).toBe(false)
  })
})
