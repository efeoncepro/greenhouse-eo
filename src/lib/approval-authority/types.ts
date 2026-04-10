import type { RoleCode } from '@/config/role-codes'

export type ApprovalWorkflowDomain =
  | 'leave'
  | 'expense_report'
  | 'onboarding'
  | 'offboarding'
  | 'performance_evaluation'

export type ApprovalStageCode =
  | 'supervisor_review'
  | 'hr_review'
  | 'finance_review'

export type ApprovalAuthoritySource =
  | 'reporting_hierarchy'
  | 'delegation'
  | 'domain_fallback'
  | 'admin_override'

export interface ApprovalAuthorityResolution {
  workflowDomain: ApprovalWorkflowDomain
  stageCode: ApprovalStageCode
  authoritySource: ApprovalAuthoritySource
  formalApproverMemberId: string | null
  formalApproverName: string | null
  effectiveApproverMemberId: string | null
  effectiveApproverName: string | null
  delegateMemberId: string | null
  delegateMemberName: string | null
  delegateResponsibilityId: string | null
  fallbackRoleCodes: RoleCode[]
  delegated: boolean
  snapshotPayload: Record<string, unknown>
}

export interface WorkflowApprovalSnapshotRecord extends ApprovalAuthorityResolution {
  snapshotId: string
  workflowEntityId: string
  subjectMemberId: string
  overrideActorUserId: string | null
  overrideReason: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}
