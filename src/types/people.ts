import type { CompensationVersion, PayrollEntry } from '@/types/payroll'
import type { TeamMemberProfile } from '@/types/team'

export type PersonTab = 'assignments' | 'activity' | 'compensation' | 'payroll'

export interface PersonListItem {
  memberId: string
  displayName: string
  publicEmail: string
  internalEmail: string | null
  roleTitle: string
  roleCategory: string
  avatarUrl: string | null
  locationCountry: string | null
  active: boolean
  totalAssignments: number
  totalFte: number
  payRegime: 'chile' | 'international' | null
}

export interface PeopleListPayload {
  items: PersonListItem[]
  summary: {
    activeMembers: number
    totalFte: number
    coveredClients: number
    chileCount: number
    internationalCount: number
  }
}

export interface PersonDetailAssignment {
  assignmentId: string
  clientId: string
  clientName: string
  fteAllocation: number
  hoursPerMonth: number | null
  roleTitleOverride: string | null
  startDate: string | null
  endDate: string | null
  active: boolean
}

export interface PersonOperationalProjectBreakdown {
  projectId: string | null
  projectName: string
  assetCount: number
}

export interface PersonOperationalMetrics {
  rpaAvg30d: number | null
  otdPercent30d: number | null
  tasksCompleted30d: number
  tasksActiveNow: number
  projectBreakdown: PersonOperationalProjectBreakdown[]
}

export interface PersonDetailMember {
  memberId: string
  displayName: string
  publicEmail: string
  internalEmail: string | null
  avatarUrl: string | null
  roleTitle: string
  roleCategory: string
  active: boolean
  contactChannel: string | null
  contactHandle: string | null
  profile: TeamMemberProfile
  identityProfileId: string | null
  notionUserId: string | null
  azureOid: string | null
  hubspotOwnerId: string | null
}

export interface PersonIntegrations {
  microsoftLinked: boolean
  notionLinked: boolean
  hubspotLinked: boolean
  identityConfidence: 'strong' | 'partial' | 'basic'
  linkedProviders: string[]
}

export interface PersonAccess {
  canViewAssignments: boolean
  canViewActivity: boolean
  canViewCompensation: boolean
  canViewPayroll: boolean
  visibleTabs: PersonTab[]
}

export interface PersonSummary {
  activeAssignments: number
  totalFte: number
  totalHoursMonth: number
}

export interface PersonDetail {
  member: PersonDetailMember
  access: PersonAccess
  summary: PersonSummary
  integrations: PersonIntegrations
  assignments?: PersonDetailAssignment[]
  operationalMetrics?: PersonOperationalMetrics | null
  currentCompensation?: CompensationVersion | null
  recentPayroll?: PayrollEntry[]
}
