// ═══════════════════════════════════════════════════════════
// PersonComplete360 — Federated serving layer types
// TASK-273: Person Complete 360
// ═══════════════════════════════════════════════════════════

// ── Facet Names ──

export const PERSON_FACET_NAMES = [
  'identity',
  'assignments',
  'organization',
  'leave',
  'payroll',
  'delivery',
  'costs',
  'staffAug'
] as const

export type PersonFacetName = (typeof PERSON_FACET_NAMES)[number]

// ── Sensitivity Levels ──

export const SENSITIVITY_LEVELS = ['public', 'internal', 'personal', 'confidential'] as const
export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number]

// ── Resolver Meta ──

export interface ResolverMeta {
  resolvedAt: string
  resolverVersion: string
  facetsRequested: PersonFacetName[]
  facetsResolved: PersonFacetName[]
  timing: Partial<Record<PersonFacetName, number>>
  cacheStatus: Partial<Record<PersonFacetName, 'hit' | 'miss' | 'stale' | 'bypass'>>
  errors: { facet: PersonFacetName; error: string }[]
  deniedFacets: { facet: PersonFacetName; reason: string }[]
  redactedFields: Partial<Record<PersonFacetName, string[]>>
  totalMs: number
}

// ── Identity Facet ──

export interface PersonIdentityFacet {
  identityProfileId: string
  eoId: string
  serialNumber: number
  canonicalEmail: string | null
  resolvedDisplayName: string
  resolvedEmail: string | null
  resolvedPhone: string | null
  resolvedAvatarUrl: string | null
  resolvedJobTitle: string | null
  departmentId: string | null
  departmentName: string | null
  jobLevel: string | null
  employmentType: string | null
  hireDate: string | null
  contractEndDate: string | null
  profileType: string
  identityStatus: string
  identityActive: boolean
  primarySourceSystem: string | null
  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean
  linkedSystems: string[]
  activeRoleCodes: string[]
}

// ── Assignments Facet ──

export interface PersonAssignmentEntry {
  assignmentId: string
  clientId: string
  clientName: string
  spaceId: string | null
  fteAllocation: number
  hoursPerMonth: number | null
  roleTitleOverride: string | null
  startDate: string | null
  endDate: string | null
  active: boolean
  teamMembers: { name: string; avatarUrl: string | null }[]
}

export type PersonAssignmentsFacet = PersonAssignmentEntry[]

// ── Organization Facet ──

export interface PersonMembershipEntry {
  membershipId: string
  organizationId: string
  organizationName: string
  spaceName: string | null
  spaceType: string | null
  membershipType: string | null
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
  startDate: string | null
}

export interface PersonOrganizationFacet {
  memberships: PersonMembershipEntry[]
  primaryOrganization: {
    organizationId: string
    organizationName: string
    publicId: string | null
  } | null
}

// ── Leave Facet ──

export interface LeaveBalanceEntry {
  leaveTypeCode: string
  leaveTypeName: string
  year: number
  allowance: number
  progressiveExtra: number
  carriedOver: number
  adjustments: number
  used: number
  reserved: number
  available: number
}

export interface LeaveRequestEntry {
  requestId: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: string
  startPeriod: string | null
  endPeriod: string | null
  reason: string | null
  createdAt: string
}

export interface LeaveSummary {
  totalPending: number
  totalApproved: number
  totalUsedThisYear: number
  totalAvailableVacation: number
}

export interface PersonLeaveFacet {
  balances: LeaveBalanceEntry[]
  recentRequests: LeaveRequestEntry[]
  recentRequestsPagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  summary: LeaveSummary
}

// ── Payroll Facet ──

export interface CurrentCompensation {
  currency: string | null
  baseSalary: number | null
  remoteAllowance: number | null
  colacion: number | null
  movilizacion: number | null
  fixedBonus: number | null
  totalComp: number | null
  payRegime: string | null
  contractType: string | null
  afpName: string | null
  healthSystem: string | null
  effectiveFrom: string | null
}

export interface PayrollEntry {
  periodYear: number
  periodMonth: number
  grossTotal: number
  netTotal: number
  status: string | null
  currency: string | null
  workingDays: number | null
  daysPresent: number | null
  daysAbsent: number | null
  daysOnLeave: number | null
}

export interface CompensationHistoryEntry {
  versionId: string
  effectiveFrom: string
  baseSalary: number
  currency: string | null
  changeReason: string | null
}

export interface PersonPayrollFacet {
  currentCompensation: CurrentCompensation | null
  lastEntry: PayrollEntry | null
  compensationHistory: CompensationHistoryEntry[]
}

// ── Delivery Facet ──

export interface DeliveryIcoMetrics {
  rpaAvg: number | null
  rpaMedian: number | null
  otdPct: number | null
  ftrPct: number | null
  throughputCount: number
  cycleTimeAvg: number | null
  stuckAssetCount: number
}

export interface DeliveryOwnedProject {
  projectId: string
  name: string
  status: string
  clientName: string | null
  active: boolean
}

export interface PersonDeliveryFacet {
  icoMetrics: DeliveryIcoMetrics
  projectCount: number
  activeProjectCount: number
  activeTaskCount: number
  completedTaskCount: number
  overdueTaskCount: number
  ownedProjects: DeliveryOwnedProject[]
  crm: {
    ownedCompanies: number
    ownedDeals: number
    openDealsAmount: number
  }
}

// ── Costs Facet ──

export interface CostPeriodSnapshot {
  year: number
  month: number
  loadedCostTarget: number
  laborCostTarget: number
  directOverhead: number
  sharedOverhead: number
  costPerHour: number | null
  utilizationPct: number | null
  capacityHealth: string | null
  contractedHours: number | null
  assignedHours: number | null
  usedHours: number | null
  periodClosed: boolean
}

export interface CostAllocationEntry {
  clientId: string
  clientName: string
  organizationName: string | null
  fteContribution: number
  commercialLoadedCost: number
  periodYear: number
  periodMonth: number
}

export interface PersonCostFacet {
  currentPeriod: CostPeriodSnapshot | null
  allocationsBySpace: CostAllocationEntry[]
}

// ── StaffAug Facet ──

export interface StaffAugPlacement {
  placementId: string
  clientName: string
  organizationName: string | null
  status: string
  billingRate: number | null
  billingCurrency: string | null
  contractStart: string | null
  contractEnd: string | null
}

export interface PersonStaffAugFacet {
  placements: StaffAugPlacement[]
  activePlacementCount: number
}

// ── Complete 360 Object ──

export interface PersonComplete360 {
  _meta: ResolverMeta
  identity: PersonIdentityFacet
  assignments?: PersonAssignmentsFacet
  organization?: PersonOrganizationFacet
  leave?: PersonLeaveFacet
  payroll?: PersonPayrollFacet
  delivery?: PersonDeliveryFacet
  costs?: PersonCostFacet
  staffAug?: PersonStaffAugFacet
}

// ── Facet Registry Definition ──

export interface FacetDefinition {
  fetch: (ctx: FacetFetchContext) => Promise<unknown>
  requiresMemberId: boolean
  cacheTTLSeconds: number
  sensitivityLevel: SensitivityLevel
}

export interface FacetFetchContext {
  profileId: string
  memberId: string | null
  userId: string | null
  organizationId: string | null
  asOf: string | null
  limit: number | null
  offset: number | null
}

// ── Authorization Types ──

export type RequesterRelation = 'self' | 'same_org' | 'different_org'

export interface FacetAuthorizationContext {
  requesterProfileId: string | null
  requesterRoleCodes: string[]
  requesterTenantType: string
  requesterOrganizationId: string | null
  targetProfileId: string
  targetOrganizationId: string | null
  requestedFacets: PersonFacetName[]
  relation: RequesterRelation
}

export interface FacetAuthorizationResult {
  allowedFacets: PersonFacetName[]
  deniedFacets: { facet: PersonFacetName; reason: string }[]
  fieldRedactions: Partial<Record<PersonFacetName, string[]>>
}

// ── Resolver Trace (Observability) ──

export interface ResolverTrace {
  traceId: string
  profileId: string
  requestedFacets: PersonFacetName[]
  resolvedFacets: PersonFacetName[]
  deniedFacets: PersonFacetName[]
  timingMs: Partial<Record<PersonFacetName, number>>
  totalMs: number
  cacheHits: number
  cacheMisses: number
  errors: { facet: string; error: string }[]
  requesterUserId: string
  timestamp: string
}
