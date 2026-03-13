export type TeamContactChannel = 'teams' | 'slack' | 'email'

export type TeamRoleCategory = 'account' | 'operations' | 'strategy' | 'design' | 'development' | 'media' | 'unknown'

export type TeamDataSource = 'team_assignments' | 'legacy_override'

export interface TeamMembersFooter {
  serviceLines: string[]
  modality: string | null
  totalFte: number
}

export interface TeamMemberResponse {
  memberId: string
  displayName: string
  email: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  relevanceNote: string | null
  contactChannel: TeamContactChannel
  contactHandle: string | null
  fteAllocation: number
  startDate: string | null
}

export interface TeamMembersPayload {
  members: TeamMemberResponse[]
  footer: TeamMembersFooter
  source: TeamDataSource
}

export interface TeamCapacityProjectBreakdown {
  projectId: string | null
  projectName: string
  assetCount: number
  activeCount: number
}

export interface TeamCapacityMember {
  memberId: string
  displayName: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  fteAllocation: number
  activeAssets: number
  completedAssets: number
  avgRpa: number | null
  projectCount: number
  projectBreakdown: TeamCapacityProjectBreakdown[]
}

export interface TeamCapacityPayload {
  summary: {
    totalFte: number
    totalHoursMonth: number
    utilizedHoursMonth: number
    utilizationPercent: number
    memberCount: number
  }
  members: TeamCapacityMember[]
  period: string
  source: TeamDataSource
  hasOperationalMetrics: boolean
}

export interface TeamByProjectMember {
  memberId: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  totalAssets: number
  activeAssets: number
  completedAssets: number
  avgRpa: number | null
  inReview: number
  changesRequested: number
}

export interface TeamByProjectPayload {
  projectId: string
  projectName: string | null
  memberCount: number
  members: TeamByProjectMember[]
  hasOperationalMetrics: boolean
}

export interface TeamBySprintMember {
  memberId: string
  displayName: string
  email: string | null
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  totalInSprint: number
  completed: number
  pending: number
  avgRpa: number | null
}

export interface TeamBySprintPayload {
  sprintId: string
  sprintName: string | null
  sprintStatus: string | null
  startDate: string | null
  endDate: string | null
  totalTasks: number
  completedTasks: number
  memberCount: number
  members: TeamBySprintMember[]
  hasOperationalMetrics: boolean
}
