export type TeamContactChannel = 'teams' | 'slack' | 'email'

export type TeamRoleCategory = 'account' | 'operations' | 'strategy' | 'design' | 'development' | 'media' | 'unknown'

export type TeamDataSource = 'team_assignments' | 'legacy_override'

export type TeamIdentityProvider = 'notion' | 'microsoft' | 'google' | 'hubspot' | 'deel' | (string & {})

export type TeamIdentityConfidence = 'strong' | 'partial' | 'basic'

export interface TeamIdentitySummary {
  identityProviders: TeamIdentityProvider[]
  identityConfidence: TeamIdentityConfidence
}

export interface TeamMemberProfile {
  firstName: string | null
  lastName: string | null
  preferredName: string | null
  legalName: string | null
  orgRoleId: string | null
  orgRoleName: string | null
  professionId: string | null
  professionName: string | null
  seniorityLevel: string | null
  employmentType: string | null
  ageYears: number | null
  phone: string | null
  teamsUserId: string | null
  slackUserId: string | null
  locationCity: string | null
  locationCountry: string | null
  timeZone: string | null
  yearsExperience: number | null
  efeonceStartDate: string | null
  tenureEfeonceMonths: number | null
  tenureClientMonths: number | null
  biography: string | null
  languages: string[]
  profileCompletenessPercent: number
}

export interface TeamMembersFooter {
  serviceLines: string[]
  modality: string | null
  totalFte: number
}

export interface TeamMemberResponse extends TeamIdentitySummary {
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
  profile: TeamMemberProfile
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

export interface TeamCapacityMember extends TeamIdentitySummary {
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

export interface TeamByProjectMember extends TeamIdentitySummary {
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

export interface TeamBySprintMember extends TeamIdentitySummary {
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

export interface CreateMemberInput {
  displayName: string
  email: string
  emailAliases?: string[]
  locationCountry?: string
  locationCity?: string
  roleTitle: string
  roleCategory: TeamRoleCategory
  avatarUrl?: string
  contactChannel?: TeamContactChannel
  contactHandle?: string
  relevanceNote?: string
  azureOid?: string
  notionUserId?: string
  hubspotOwnerId?: string
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {
  active?: boolean
}

export interface CreateAssignmentInput {
  clientId: string
  memberId: string
  fteAllocation: number
  hoursPerMonth?: number
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: TeamContactChannel
  contactHandleOverride?: string
  startDate?: string
}

export interface UpdateAssignmentInput {
  fteAllocation?: number
  hoursPerMonth?: number
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: TeamContactChannel
  contactHandleOverride?: string
}

export interface TeamAdminMemberRecord {
  memberId: string
  displayName: string
  email: string
  emailAliases: string[]
  roleTitle: string
  roleCategory: TeamRoleCategory
  avatarUrl: string | null
  locationCountry: string | null
  locationCity: string | null
  contactChannel: TeamContactChannel
  contactHandle: string | null
  relevanceNote: string | null
  azureOid: string | null
  notionUserId: string | null
  hubspotOwnerId: string | null
  active: boolean
}

export interface TeamAdminAssignmentRecord {
  assignmentId: string
  clientId: string
  clientName: string | null
  memberId: string
  fteAllocation: number
  hoursPerMonth: number | null
  roleTitleOverride: string | null
  relevanceNoteOverride: string | null
  contactChannelOverride: TeamContactChannel | null
  contactHandleOverride: string | null
  startDate: string | null
  endDate: string | null
  active: boolean
}

export interface TeamAdminClientOption {
  clientId: string
  clientName: string
  active: boolean
}

export interface TeamAdminMetadata {
  canManageTeam: boolean
  memberCrud: boolean
  assignmentCrud: boolean
  requiredRole: 'efeonce_admin'
  roleCategories: TeamRoleCategory[]
  contactChannels: TeamContactChannel[]
  activeClients: TeamAdminClientOption[]
}
