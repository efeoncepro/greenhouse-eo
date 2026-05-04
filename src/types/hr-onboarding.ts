import type { ContractType } from './hr-contracts'

export const HR_ONBOARDING_TEMPLATE_TYPES = ['onboarding', 'offboarding'] as const
export type HrOnboardingTemplateType = (typeof HR_ONBOARDING_TEMPLATE_TYPES)[number]

export const HR_ONBOARDING_ASSIGNED_ROLES = ['hr', 'it', 'supervisor', 'collaborator', 'payroll', 'delivery'] as const
export type HrOnboardingAssignedRole = (typeof HR_ONBOARDING_ASSIGNED_ROLES)[number]

export const HR_ONBOARDING_INSTANCE_STATUSES = ['active', 'completed', 'cancelled'] as const
export type HrOnboardingInstanceStatus = (typeof HR_ONBOARDING_INSTANCE_STATUSES)[number]

export const HR_ONBOARDING_ITEM_STATUSES = ['pending', 'in_progress', 'done', 'skipped', 'blocked'] as const
export type HrOnboardingItemStatus = (typeof HR_ONBOARDING_ITEM_STATUSES)[number]

export type HrOnboardingSource = 'manual_hr' | 'member_event' | 'offboarding_case' | 'scim' | 'system'

export interface HrOnboardingTemplateItem {
  itemId: string
  templateId: string
  title: string
  description: string | null
  assignedRole: HrOnboardingAssignedRole
  dueDaysOffset: number
  required: boolean
  displayOrder: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface HrOnboardingTemplate {
  templateId: string
  name: string
  type: HrOnboardingTemplateType
  description: string | null
  applicableContractTypes: ContractType[]
  active: boolean
  metadata: Record<string, unknown>
  items: HrOnboardingTemplateItem[]
  createdAt: string
  updatedAt: string
}

export interface HrOnboardingInstanceItem {
  instanceItemId: string
  instanceId: string
  templateItemId: string
  title: string
  description: string | null
  assignedRole: HrOnboardingAssignedRole
  dueDate: string | null
  required: boolean
  displayOrder: number
  status: HrOnboardingItemStatus
  completedAt: string | null
  completedByUserId: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface HrOnboardingInstance {
  instanceId: string
  templateId: string
  templateName: string | null
  memberId: string
  memberName: string | null
  offboardingCaseId: string | null
  type: HrOnboardingTemplateType
  status: HrOnboardingInstanceStatus
  startDate: string
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  source: HrOnboardingSource
  sourceRef: Record<string, unknown>
  metadata: Record<string, unknown>
  progress: {
    total: number
    required: number
    completed: number
    overdue: number
    percent: number
  }
  items: HrOnboardingInstanceItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateHrOnboardingTemplateInput {
  name: string
  type: HrOnboardingTemplateType
  description?: string | null
  applicableContractTypes?: ContractType[]
  active?: boolean
  items?: Array<{
    title: string
    description?: string | null
    assignedRole: HrOnboardingAssignedRole
    dueDaysOffset?: number
    required?: boolean
  }>
}

export interface UpdateHrOnboardingTemplateInput {
  name?: string
  description?: string | null
  applicableContractTypes?: ContractType[]
  active?: boolean
}

export interface CreateHrOnboardingInstanceInput {
  memberId: string
  templateId?: string | null
  type: HrOnboardingTemplateType
  startDate?: string | null
  offboardingCaseId?: string | null
  source?: HrOnboardingSource
  sourceRef?: Record<string, unknown>
}
