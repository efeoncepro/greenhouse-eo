import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

export const ONBOARDING_CASE_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'scheduled',
  'blocked',
  'active',
  'cancelled'
] as const

export type OnboardingCaseStatus = (typeof ONBOARDING_CASE_STATUSES)[number]

export const ONBOARDING_START_TYPES = [
  'new_hire',
  'rehire',
  'relationship_transition',
  'contractor_start',
  'eor_start',
  'identity_only',
  'other'
] as const

export type OnboardingStartType = (typeof ONBOARDING_START_TYPES)[number]

export const ONBOARDING_SOURCES = [
  'manual_hr',
  'people',
  'scim',
  'admin',
  'hiring_handoff',
  'external_provider',
  'legacy_checklist',
  'system'
] as const

export type OnboardingSource = (typeof ONBOARDING_SOURCES)[number]

export const ONBOARDING_RULE_LANES = [
  'internal_payroll',
  'external_payroll',
  'non_payroll',
  'identity_only',
  'relationship_transition',
  'unknown'
] as const

export type OnboardingRuleLane = (typeof ONBOARDING_RULE_LANES)[number]

export type OnboardingRelationshipType = 'employee' | 'contractor' | 'eor' | 'executive' | 'other'
export type GreenhouseOnboardingExecutionMode = 'full' | 'partial' | 'informational'

export interface OnboardingLaneDecision {
  ruleLane: OnboardingRuleLane
  requiresIdentityProvisioning: boolean
  requiresApplicationAccess: boolean
  requiresPayrollReadiness: boolean
  requiresLeavePolicyBootstrap: boolean
  requiresHrDocuments: boolean
  requiresAssignmentBootstrap: boolean
  requiresManagerAssignment: boolean
  requiresEquipmentOrAccessSetup: boolean
  greenhouseExecutionMode: GreenhouseOnboardingExecutionMode
}

export interface WorkRelationshipOnboardingCase {
  onboardingCaseId: string
  publicId: string
  profileId: string
  memberId: string | null
  userId: string | null
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string | null
  organizationId: string | null
  spaceId: string | null
  relationshipType: OnboardingRelationshipType
  employmentType: string | null
  contractTypeSnapshot: ContractType | 'unknown'
  payRegimeSnapshot: PayRegime | 'unknown'
  payrollViaSnapshot: PayrollVia | 'none' | 'unknown'
  deelContractIdSnapshot: string | null
  countryCode: string | null
  startType: OnboardingStartType
  source: OnboardingSource
  status: OnboardingCaseStatus
  ruleLane: OnboardingRuleLane
  requiresIdentityProvisioning: boolean
  requiresApplicationAccess: boolean
  requiresPayrollReadiness: boolean
  requiresLeavePolicyBootstrap: boolean
  requiresHrDocuments: boolean
  requiresAssignmentBootstrap: boolean
  requiresManagerAssignment: boolean
  requiresEquipmentOrAccessSetup: boolean
  greenhouseExecutionMode: GreenhouseOnboardingExecutionMode
  startDate: string | null
  firstWorkingDay: string | null
  submittedAt: string | null
  approvedAt: string | null
  scheduledAt: string | null
  activatedAt: string | null
  cancelledAt: string | null
  blockedReason: string | null
  managerMemberId: string | null
  reasonCode: string | null
  notes: string | null
  legacyChecklistRef: Record<string, unknown>
  sourceRef: Record<string, unknown>
  metadata: Record<string, unknown>
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOnboardingCaseInput {
  memberId: string
  startType?: OnboardingStartType
  source?: OnboardingSource
  status?: Extract<OnboardingCaseStatus, 'draft' | 'needs_review' | 'approved'>
  startDate?: string | null
  firstWorkingDay?: string | null
  managerMemberId?: string | null
  reasonCode?: string | null
  notes?: string | null
  sourceRef?: Record<string, unknown>
  legacyChecklistRef?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface TransitionOnboardingCaseInput {
  status: OnboardingCaseStatus
  startDate?: string | null
  firstWorkingDay?: string | null
  blockedReason?: string | null
  reason?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface EnsureOnboardingCaseForMemberInput {
  memberId: string
  actorUserId?: string | null
  source?: OnboardingSource
  reason?: string | null
  sourceRef?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
