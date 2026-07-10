// TASK-770 — Bridge Hiring→HRIS: tipos del hiring_activation_request (mapping durable del
// bridge). NO es un state-machine paralelo de member: la activación del colaborador pasa
// SOLO por completeWorkforceMemberIntake + readiness (TASK-872/874); este request registra
// el progreso del bridge y las evidencias downstream (member/onboarding).
//
// Boundary duro: este dominio NUNCA escribe payroll_*/compensation_versions/final_settlements/
// contractor_engagements/providers/expenses/assignments/placements/user_role_assignments/
// client_users. El member se materializa vía el core source-neutral (member-core.ts), espejo
// del patrón SCIM: active=TRUE + workforce_intake_status='pending_intake' (el gate operacional
// de payroll/capacity es el intake status, no la columna active).

export const HIRING_ACTIVATION_STATES = [
  'pending_hr_review',
  'blocked',
  'member_created',
  'onboarding_open',
  'active',
  'cancelled',
] as const
export type HiringActivationState = (typeof HIRING_ACTIVATION_STATES)[number]

export const HIRING_ACTIVATION_BLOCKED_REASONS = [
  'ambiguous_identity',
  'member_conflict',
  'member_already_active',
  'onboarding_template_missing',
  'handoff_not_approved',
  'legal_data_missing',
] as const
export type HiringActivationBlockedReason = (typeof HIRING_ACTIVATION_BLOCKED_REASONS)[number]

export const HIRING_ACTIVATION_MEMBER_OUTCOMES = ['created_new', 'linked_existing', 'reactivated'] as const
export type HiringActivationMemberOutcome = (typeof HIRING_ACTIVATION_MEMBER_OUTCOMES)[number]

export const HIRING_ACTIVATION_COMMAND_ACTIONS = [
  'review',
  'create-member',
  'open-onboarding',
  'complete',
  'cancel',
] as const
export type HiringActivationCommandAction = (typeof HIRING_ACTIVATION_COMMAND_ACTIONS)[number]

export interface HiringActivationRequest {
  activationRequestId: string
  hiringHandoffId: string
  hiringApplicationId: string
  identityProfileId: string
  candidateFacetId: string
  memberId: string | null
  memberOutcome: HiringActivationMemberOutcome | null
  onboardingInstanceId: string | null
  onboardingCaseId: string | null
  state: HiringActivationState
  blockedReason: HiringActivationBlockedReason | null
  blockedDetail: string | null
  stateChangedAt: string
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface MaterializeMemberInput {
  identityProfileId: string
  displayName: string
  primaryEmail: string | null
  hireDate: string | null
  roleTitle: string | null
}

export interface MaterializeMemberResult {
  memberId: string
  outcome: HiringActivationMemberOutcome
}
