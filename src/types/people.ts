import type { PersonDeliveryContext } from '@/lib/person-360/get-person-delivery'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { CompensationVersion, PayrollEntry } from '@/types/payroll'
import type { TeamCapacityHealth, TeamMemberProfile } from '@/types/team'

export type PersonTab = 'activity' | 'compensation' | 'payroll' | 'finance' | 'memberships' | 'hr-profile' | 'ai-tools' | 'identity' | 'intelligence'

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
  filters: {
    roleCategories: Array<{
      roleCategory: string
      count: number
    }>
    countries: Array<{
      countryCode: string
      count: number
    }>
    payRegimes: Array<{
      payRegime: 'chile' | 'international' | 'unknown'
      count: number
    }>
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
  eoId: string | null
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
  canViewMemberships: boolean
  canViewAssignments: boolean
  canViewActivity: boolean
  canViewCompensation: boolean
  canViewPayroll: boolean
  canViewFinance: boolean
  canViewHrProfile: boolean
  canViewAiTools: boolean
  canViewIdentityContext: boolean
  canViewAccessContext: boolean
  visibleTabs: PersonTab[]
}

export interface PersonSummary {
  activeAssignments: number
  totalFte: number
  totalHoursMonth: number
}

export interface PersonCapacitySummary {
  assignedHoursMonth: number
  activeAssets: number
  completedAssets: number
  projectCount: number
  expectedMonthlyThroughput: number
  utilizationPercent: number
  capacityHealth: TeamCapacityHealth
}

export interface PersonFinanceSummary {
  activeAssignmentsCount: number
  payrollEntriesCount: number
  expenseCount: number
  paidExpensesCount: number
  totalExpensesClp: number
  lastExpenseDate: string | null
}

export interface PersonFinanceOverview {
  member: {
    memberId: string
    displayName: string | null
    identityProfileId: string | null
  }
  summary: PersonFinanceSummary
  assignments: Array<{
    assignmentId: string
    clientId: string
    clientName: string
    fteAllocation: number
    hoursPerMonth: number
    roleTitleOverride: string | null
    startDate: string | null
    endDate: string | null
    active: boolean
  }>
  identities: Array<{
    sourceSystem: string | null
    sourceObjectId: string | null
    sourceUserId: string | null
    sourceEmail: string | null
    sourceDisplayName: string | null
  }>
  payrollHistory: Array<{
    entryId: string
    periodId: string
    year: number
    month: number
    status: string | null
    currency: string | null
    grossTotal: number
    netTotal: number
    createdAt: string | null
  }>
  expenses: Array<{
    expenseId: string
    clientId: string | null
    clientName: string | null
    expenseType: string
    description: string
    currency: string
    totalAmount: number
    totalAmountClp: number
    paymentStatus: string
    paymentDate: string | null
    documentDate: string | null
    supplierName: string | null
    serviceLine: string | null
    payrollEntryId: string | null
    createdAt: string | null
  }>
  costAttribution?: Array<{
    clientId: string
    clientName: string
    organizationName: string | null
    fteAllocation: number
    attributedCostClp: number
    periodYear: number
    periodMonth: number
  }>
}

export interface PersonIdentityContext {
  eoId: string | null
  identityProfileId: string | null
  linkedUserId: string | null
  canonicalEmail: string | null
  primarySourceSystem: string | null
  defaultAuthMode: string | null
  linkedSystems: string[]
  sourceLinkCount: number
  userCount: number
  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean
  crmContactId: string | null
}

export interface PersonAccessContext {
  userId: string
  userPublicId: string | null
  email: string | null
  tenantType: string
  authMode: string | null
  status: string
  active: boolean
  lastLoginAt: string | null
  defaultPortalHomePath: string | null
  roleCodes: string[]
  routeGroups: string[]
  canOpenAdminUser: boolean
}

export interface PeopleMetaPayload {
  canManageTeam: boolean
  visibleTabs: PersonTab[]
  supportedTabs: PersonTab[]
  availableEnrichments: {
    activity: boolean
    compensation: boolean
    payroll: boolean
    finance: boolean
    capacity: boolean
    identity: boolean
    access: boolean
    hrProfile: boolean
    aiTools: boolean
    deliveryContext: boolean
  }
  allowedRoleCodes: string[]
}

export interface PersonDetail {
  member: PersonDetailMember
  access: PersonAccess
  summary: PersonSummary
  integrations: PersonIntegrations
  linkedUserId?: string | null
  identityContext?: PersonIdentityContext | null
  accessContext?: PersonAccessContext | null
  capacity?: PersonCapacitySummary | null
  financeSummary?: PersonFinanceSummary | null
  assignments?: PersonDetailAssignment[]
  operationalMetrics?: PersonOperationalMetrics | null
  currentCompensation?: CompensationVersion | null
  recentPayroll?: PayrollEntry[]
  hrContext?: PersonHrContext | null
  deliveryContext?: PersonDeliveryContext | null
}
