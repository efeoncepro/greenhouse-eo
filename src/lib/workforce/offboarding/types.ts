import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'

export const OFFBOARDING_CASE_STATUSES = [
  'draft',
  'needs_review',
  'approved',
  'scheduled',
  'blocked',
  'executed',
  'cancelled'
] as const

export type OffboardingCaseStatus = (typeof OFFBOARDING_CASE_STATUSES)[number]

export const OFFBOARDING_SEPARATION_TYPES = [
  'resignation',
  'termination',
  'fixed_term_expiry',
  'mutual_agreement',
  'contract_end',
  'relationship_transition',
  'identity_only',
  'other'
] as const

export type OffboardingSeparationType = (typeof OFFBOARDING_SEPARATION_TYPES)[number]

export const OFFBOARDING_SOURCES = [
  'manual_hr',
  'people',
  'scim',
  'admin',
  'contract_expiry',
  'external_provider',
  'legacy_checklist',
  'system'
] as const

export type OffboardingSource = (typeof OFFBOARDING_SOURCES)[number]

export const OFFBOARDING_RULE_LANES = [
  'internal_payroll',
  'external_payroll',
  'non_payroll',
  'identity_only',
  'relationship_transition',
  'unknown'
] as const

export type OffboardingRuleLane = (typeof OFFBOARDING_RULE_LANES)[number]

export type OffboardingRelationshipType = 'employee' | 'contractor' | 'eor' | 'executive' | 'other'
export type GreenhouseExecutionMode = 'full' | 'partial' | 'informational'

export interface OffboardingLaneDecision {
  ruleLane: OffboardingRuleLane
  requiresPayrollClosure: boolean
  requiresLeaveReconciliation: boolean
  requiresHrDocuments: boolean
  requiresAccessRevocation: boolean
  requiresAssetRecovery: boolean
  requiresAssignmentHandoff: boolean
  requiresApprovalReassignment: boolean
  greenhouseExecutionMode: GreenhouseExecutionMode
}

export interface OffboardingCase {
  offboardingCaseId: string
  publicId: string
  profileId: string
  memberId: string | null
  userId: string | null
  personLegalEntityRelationshipId: string | null
  legalEntityOrganizationId: string | null
  organizationId: string | null
  spaceId: string | null
  relationshipType: OffboardingRelationshipType
  employmentType: string | null
  contractTypeSnapshot: ContractType | 'unknown'
  payRegimeSnapshot: PayRegime | 'unknown'
  payrollViaSnapshot: PayrollVia | 'none' | 'unknown'
  deelContractIdSnapshot: string | null
  countryCode: string | null
  contractEndDateSnapshot: string | null
  separationType: OffboardingSeparationType
  source: OffboardingSource
  status: OffboardingCaseStatus
  ruleLane: OffboardingRuleLane
  requiresPayrollClosure: boolean
  requiresLeaveReconciliation: boolean
  requiresHrDocuments: boolean
  requiresAccessRevocation: boolean
  requiresAssetRecovery: boolean
  requiresAssignmentHandoff: boolean
  requiresApprovalReassignment: boolean
  greenhouseExecutionMode: GreenhouseExecutionMode
  effectiveDate: string | null
  lastWorkingDay: string | null
  lastWorkingDayAfterEffectiveReason: string | null
  submittedAt: string | null
  approvedAt: string | null
  scheduledAt: string | null
  executedAt: string | null
  cancelledAt: string | null
  blockedReason: string | null
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

export interface CreateOffboardingCaseInput {
  memberId: string
  separationType: OffboardingSeparationType
  source?: OffboardingSource
  status?: Extract<OffboardingCaseStatus, 'draft' | 'needs_review'>
  effectiveDate?: string | null
  lastWorkingDay?: string | null
  lastWorkingDayAfterEffectiveReason?: string | null
  reasonCode?: string | null
  notes?: string | null
  sourceRef?: Record<string, unknown>
  legacyChecklistRef?: Record<string, unknown>
}

export interface TransitionOffboardingCaseInput {
  status: OffboardingCaseStatus
  effectiveDate?: string | null
  lastWorkingDay?: string | null
  lastWorkingDayAfterEffectiveReason?: string | null
  blockedReason?: string | null
  reason?: string | null
  notes?: string | null
}

export interface OffboardingCaseListFilters {
  status?: OffboardingCaseStatus | 'active' | null
  memberId?: string | null
  limit?: number
}
