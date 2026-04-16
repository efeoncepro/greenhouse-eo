import type { ApprovalStageCode } from '@/lib/approval-authority/types'
import type { HrApprovalAction, HrLeaveRequest } from '@/types/hr-core'

type LeaveReviewActorContext = {
  currentMemberId: string | null
  hasHrAdminAccess: boolean
}

export type LeaveReviewCapabilities = {
  allowedActions: HrApprovalAction[]
  canOpenReview: boolean
  canApprove: boolean
  canReject: boolean
  canCancel: boolean
  currentStageCode: ApprovalStageCode | null
  effectiveApproverMemberId: string | null
}

const PENDING_REVIEW_STATUSES = new Set<HrLeaveRequest['status']>(['pending_supervisor', 'pending_hr'])

export const getLeaveApprovalStageCode = (status: HrLeaveRequest['status']): ApprovalStageCode | null => {
  if (status === 'pending_supervisor') {
    return 'supervisor_review'
  }

  if (status === 'pending_hr') {
    return 'hr_review'
  }

  return null
}

export const getEffectiveLeaveApproverMemberId = (request: HrLeaveRequest) =>
  request.approvalSnapshot?.effectiveApproverMemberId ?? request.supervisorMemberId ?? null

export const getAllowedLeaveReviewActions = ({
  request,
  actor
}: {
  request: HrLeaveRequest
  actor: LeaveReviewActorContext
}): HrApprovalAction[] => {
  if (!PENDING_REVIEW_STATUSES.has(request.status)) {
    return []
  }

  if (actor.hasHrAdminAccess) {
    return ['cancel', 'reject', 'approve']
  }

  const actorMemberId = actor.currentMemberId

  if (!actorMemberId) {
    return []
  }

  const effectiveApproverMemberId = getEffectiveLeaveApproverMemberId(request)
  const isOwner = actorMemberId === request.memberId

  const isSupervisorReviewer =
    request.status === 'pending_supervisor' &&
    actorMemberId !== request.memberId &&
    actorMemberId === effectiveApproverMemberId

  if (isOwner) {
    return ['cancel']
  }

  if (isSupervisorReviewer) {
    return ['reject', 'approve']
  }

  return []
}

export const canPerformLeaveReviewAction = ({
  request,
  actor,
  action
}: {
  request: HrLeaveRequest
  actor: LeaveReviewActorContext
  action: HrApprovalAction
}) => getAllowedLeaveReviewActions({ request, actor }).includes(action)

export const getLeaveReviewCapabilities = ({
  request,
  actor
}: {
  request: HrLeaveRequest
  actor: LeaveReviewActorContext
}): LeaveReviewCapabilities => {
  const allowedActions = getAllowedLeaveReviewActions({ request, actor })

  return {
    allowedActions,
    canOpenReview: allowedActions.length > 0,
    canApprove: allowedActions.includes('approve'),
    canReject: allowedActions.includes('reject'),
    canCancel: allowedActions.includes('cancel'),
    currentStageCode: getLeaveApprovalStageCode(request.status),
    effectiveApproverMemberId: getEffectiveLeaveApproverMemberId(request)
  }
}
