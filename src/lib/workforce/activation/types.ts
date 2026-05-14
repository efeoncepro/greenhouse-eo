import type { WorkforceIntakeStatus } from '@/types/people'

export type WorkforceActivationLaneKey =
  | 'identity_access'
  | 'work_relationship'
  | 'employment'
  | 'role_title'
  | 'compensation'
  | 'legal_profile'
  | 'payment_profile'
  | 'operational_integrations'
  | 'operational_onboarding'
  | 'contractor_engagement'

export type WorkforceActivationLaneStatus = 'ready' | 'blocked' | 'warning' | 'not_applicable'

export type WorkforceActivationReadinessStatus =
  | 'pending_intake'
  | 'in_review'
  | 'blocked'
  | 'ready_to_complete'
  | 'completed'

export type WorkforceActivationBlockerCode =
  | 'member_not_found'
  | 'member_inactive'
  | 'identity_profile_missing'
  | 'work_relationship_missing'
  | 'hire_date_missing'
  | 'employment_type_missing'
  | 'contract_type_missing'
  | 'pay_regime_missing'
  | 'payroll_via_missing'
  | 'role_title_missing'
  | 'compensation_missing'
  | 'compensation_amount_missing'
  | 'legal_profile_blocked'
  | 'payment_profile_missing_or_unapproved'
  | 'notion_link_missing'
  | 'notion_link_ambiguous'
  | 'notion_link_conflict'
  | 'notion_discovery_unavailable'
  | 'onboarding_case_blocked'
  | 'contractor_engagement_missing'

export type WorkforceActivationWarningCode =
  | 'identity_access_missing_login'
  | 'role_title_drift_pending'
  | 'legal_profile_warning'
  | 'payment_profile_draft_activation_required'
  | 'payment_profile_pending_approval'
  | 'payment_profile_managed_by_deel'
  | 'onboarding_case_missing'
  | 'onboarding_case_open'
  | 'onboarding_case_unavailable'
  | 'onboarding_checklist_missing'
  | 'onboarding_checklist_incomplete'
  | 'contractor_engagement_pending_foundation'

export interface WorkforceActivationIssue {
  readonly code: WorkforceActivationBlockerCode | WorkforceActivationWarningCode
  readonly lane: WorkforceActivationLaneKey
  readonly label: string
  readonly detail: string
  readonly owner: 'People Ops' | 'HR Ops' | 'Finance Ops' | 'People Systems' | 'Hiring Manager'
  readonly deepLink: string
}

export interface WorkforceActivationLane {
  readonly key: WorkforceActivationLaneKey
  readonly label: string
  readonly status: WorkforceActivationLaneStatus
  readonly owner: WorkforceActivationIssue['owner']
  readonly detail: string
  readonly deepLink: string
}

export interface WorkforceActivationMemberSnapshot {
  readonly memberId: string
  readonly displayName: string
  readonly primaryEmail: string | null
  readonly workforceIntakeStatus: WorkforceIntakeStatus
  readonly identityProfileId: string | null
  readonly active: boolean
  readonly assignable: boolean
  readonly createdAt: string | null
  readonly ageDays: number
  readonly hireDate: string | null
  readonly employmentType: string | null
  readonly contractType: string | null
  readonly contractEndDate: string | null
  readonly dailyRequired: boolean | null
  readonly payRegime: string | null
  readonly payrollVia: string | null
  readonly deelContractId: string | null
  readonly roleTitle: string | null
  readonly roleTitleSource: string | null
  readonly compensationCurrency: 'CLP' | 'USD' | null
  readonly compensationAmount: number | null
  readonly notionUserId: string | null
  readonly notionDisplayName: string | null
  readonly notionSourceLinkId: string | null
  readonly externalIdentityRequired: boolean
}

export interface WorkforceActivationReadiness {
  readonly member: WorkforceActivationMemberSnapshot
  readonly status: WorkforceActivationReadinessStatus
  readonly ready: boolean
  readonly readinessScore: number
  readonly blockerCount: number
  readonly warningCount: number
  readonly topBlockerLane: WorkforceActivationLaneKey | null
  readonly lanes: readonly WorkforceActivationLane[]
  readonly blockers: readonly WorkforceActivationIssue[]
  readonly warnings: readonly WorkforceActivationIssue[]
  readonly evaluatedAt: string
}
