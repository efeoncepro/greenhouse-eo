import type { TeamRoleCategory } from '@/types/team'

export type AgencyTeamUsageKind = 'none' | 'hours' | 'percent' | (string & {})

export interface AgencyTeamCapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number | null
  availableHoursMonth: number
  commercialAvailabilityHours?: number
  operationalAvailabilityHours?: number | null
  overcommitted: boolean
}

export interface AgencyTeamAssignment {
  assignmentId: string
  clientId: string | null
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
  organizationId: string | null
  fteAllocation: number
  hoursPerMonth: number
  startDate: string | null
  assignmentType: string
  placementId: string | null
  placementStatus: string | null
}

export interface AgencyTeamMemberIntelligence {
  costPerHour: number | null
  suggestedBillRate: number | null
  targetCurrency: string | null
}

export interface AgencyTeamMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  roleCategory: TeamRoleCategory | null
  assignable: boolean
  fteAllocation: number
  usageKind: AgencyTeamUsageKind
  usagePercent: number | null
  utilizationPercent: number
  capacityHealth: string
  capacity: AgencyTeamCapacityBreakdown
  intelligence: AgencyTeamMemberIntelligence | null
  assignments: AgencyTeamAssignment[]
}

export interface AgencyTeamPayload {
  team: AgencyTeamCapacityBreakdown & {
    usageKind: AgencyTeamUsageKind
    usagePercent: number | null
  }
  members: AgencyTeamMember[]
  excludedMembers: AgencyTeamMember[]
  memberCount: number
  excludedCount: number
  hasOperationalMetrics: boolean
  overcommittedCount: number
  overcommittedMembers: Array<{
    memberId: string
    displayName: string
    deficit: number
  }>
}
