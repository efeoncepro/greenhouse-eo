import type { ContractType, PayrollVia, PayRegime } from '@/types/hr-contracts'
import type { PersonListItem } from '@/types/people'
import type { ApprovalStageCode, WorkflowApprovalSnapshotRecord } from '@/lib/approval-authority/types'

export type HrJobLevel = 'junior' | 'semi_senior' | 'senior' | 'lead' | 'manager' | 'director'
export type HrEmploymentType = 'full_time' | 'part_time' | 'contractor'
export type HrHealthSystem = 'fonasa' | 'isapre' | 'none'
export type HrBankAccountType = 'corriente' | 'vista' | 'ahorro' | 'rut'
export type HrLeaveRequestStatus =
  | 'pending_supervisor'
  | 'pending_hr'
  | 'approved'
  | 'rejected'
  | 'cancelled'
export type HrApprovalAction = 'approve' | 'reject' | 'cancel'
export type HrAttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'holiday'

export interface HrDepartment {
  departmentId: string
  name: string
  description: string | null
  parentDepartmentId: string | null
  headMemberId: string | null
  headMemberName: string | null
  businessUnit: string
  active: boolean
  sortOrder: number
}

export interface HrMemberProfile {
  memberId: string
  displayName: string
  email: string
  departmentId: string | null
  departmentName: string | null
  reportsTo: string | null
  reportsToName: string | null
  jobLevel: HrJobLevel | null
  hireDate: string | null
  contractEndDate: string | null
  employmentType: HrEmploymentType | null
  dailyRequired: boolean
  contractType?: ContractType
  payRegime?: PayRegime
  payrollVia?: PayrollVia
  deelContractId?: string | null
  identityDocumentType: string | null
  identityDocumentNumberMasked: string | null
  phone: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  healthSystem: HrHealthSystem | null
  isapreName: string | null
  bankName: string | null
  bankAccountType: HrBankAccountType | null
  bankAccountNumberMasked: string | null
  cvUrl: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  skills: string[]
  tools: string[]
  aiSuites: string[]
  strengths: string[]
  improvementAreas: string[]
  pieceTypes: string[]
  avgMonthlyVolume: number | null
  throughputAvg30d: number | null
  rpaAvg30d: number | null
  otdPercent30d: number | null
  notes: string | null
  updatedAt: string | null
}

export interface HrLeaveType {
  leaveTypeCode: string
  leaveTypeName: string
  description: string | null
  defaultAnnualAllowanceDays: number
  requiresAttachment: boolean
  isPaid: boolean
  active: boolean
  colorToken: string | null
}

export interface HrLeaveBalance {
  balanceId: string
  memberId: string
  memberName: string | null
  leaveTypeCode: string
  leaveTypeName: string
  year: number
  allowanceDays: number
  progressiveExtraDays?: number
  carriedOverDays: number
  adjustmentDays?: number
  accumulatedPeriods?: number
  usedDays: number
  reservedDays: number
  availableDays: number
}

export interface HrLeavePayrollImpactPeriod {
  periodId: string
  year: number
  month: number
  status: 'draft' | 'calculated' | 'approved' | 'exported'
}

export interface HrLeavePayrollImpactSummary {
  mode: 'none' | 'recalculate_recommended' | 'deferred_adjustment_required'
  impactedPeriods: HrLeavePayrollImpactPeriod[]
}

export interface HrLeaveRequest {
  requestId: string
  memberId: string
  memberName: string | null
  memberAvatarUrl: string | null
  leaveTypeCode: string
  leaveTypeName: string
  startDate: string
  endDate: string
  startPeriod: 'full_day' | 'morning' | 'afternoon'
  endPeriod: 'full_day' | 'morning' | 'afternoon'
  requestedDays: number
  status: HrLeaveRequestStatus
  reason: string | null
  attachmentAssetId?: string | null
  attachmentUrl: string | null
  supervisorMemberId: string | null
  supervisorName: string | null
  approvalStageCode?: ApprovalStageCode | null
  approvalSnapshot?: WorkflowApprovalSnapshotRecord | null
  hrReviewerUserId: string | null
  decidedAt: string | null
  decidedBy: string | null
  notes: string | null
  createdAt: string | null
  holidaySource?: 'nager' | 'empty-fallback' | 'none'
  payrollImpact?: HrLeavePayrollImpactSummary | null
}

export interface HrLeavePolicy {
  policyId: string
  leaveTypeCode: string
  policyName: string
  annualDays: number
  minAdvanceDays: number
  minContinuousDays: number | null
  maxCarryOverDays: number
  progressiveEnabled: boolean
  requiresApproval: boolean
  allowNegativeBalance: boolean
  active: boolean
}

export interface HrLeaveCalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay?: boolean
  color?: string
  extendedProps?: Record<string, unknown>
}

export interface HrLeaveCalendarResponse {
  from: string
  to: string
  holidaySource: 'nager' | 'empty-fallback' | 'none'
  events: HrLeaveCalendarEvent[]
}

export interface HrAttendanceRecord {
  attendanceId: string
  memberId: string
  memberName: string | null
  attendanceDate: string
  attendanceStatus: HrAttendanceStatus
  sourceSystem: string
  sourceReference: string | null
  checkInAt: string | null
  meetingJoinedAt: string | null
  meetingLeftAt: string | null
  minutesPresent: number | null
  notes: string | null
  recordedBy: string | null
  updatedAt: string | null
}

export interface HrCoreMetadata {
  currentMemberId?: string | null
  hasHrAdminAccess?: boolean
  departments: HrDepartment[]
  leaveTypes: HrLeaveType[]
  jobLevels: HrJobLevel[]
  employmentTypes: HrEmploymentType[]
  healthSystems: HrHealthSystem[]
  bankAccountTypes: HrBankAccountType[]
  leaveRequestStatuses: HrLeaveRequestStatus[]
  attendanceStatuses: HrAttendanceStatus[]
}

export interface HrSupervisorWorkspaceTeamMember extends PersonListItem {
  supervisorMemberId: string | null
  depth: number
  directReport: boolean
}

export interface HrSupervisorWorkspaceSummary {
  directReports: number
  totalVisibleReports: number
  pendingApprovals: number
  upcomingAbsences: number
}

export interface HrSupervisorWorkspaceResponse {
  currentMemberId: string | null
  hasBroadAccess: boolean
  hasDirectReports: boolean
  hasDelegatedAuthority: boolean
  summary: HrSupervisorWorkspaceSummary
  team: HrSupervisorWorkspaceTeamMember[]
  approvals: HrLeaveRequest[]
  calendar: HrLeaveCalendarResponse
}

export interface HrDepartmentsResponse {
  departments: HrDepartment[]
  summary: {
    total: number
    active: number
  }
}

export interface HrMemberOption {
  memberId: string
  displayName: string
  roleTitle: string | null
}

export interface HrMemberOptionsResponse {
  members: HrMemberOption[]
}

export interface HrHierarchyRecord {
  reportingLineId: string
  memberId: string
  memberName: string
  memberActive: boolean
  memberAvatarUrl: string | null
  roleTitle: string | null
  departmentId: string | null
  departmentName: string | null
  supervisorMemberId: string | null
  supervisorName: string | null
  supervisorActive: boolean | null
  effectiveFrom: string
  sourceSystem: string
  changeReason: string
  changedByUserId: string | null
  directReportsCount: number
  subtreeSize: number
  depth: number
  isRoot: boolean
  delegation: {
    responsibilityId: string
    delegateMemberId: string
    delegateMemberName: string | null
    effectiveFrom: string
    effectiveTo: string | null
  } | null
}

export interface HrHierarchyResponse {
  items: HrHierarchyRecord[]
  summary: {
    total: number
    active: number
    roots: number
    withoutSupervisor: number
    delegatedApprovals: number
  }
}

export interface HrOrgChartNode {
  nodeId: string
  nodeType: 'department' | 'member'
  memberId: string | null
  departmentId: string | null
  contextDepartmentId: string | null
  displayName: string
  publicEmail: string
  internalEmail: string | null
  avatarUrl: string | null
  roleTitle: string | null
  roleCategory: string
  departmentName: string | null
  contextDepartmentName: string | null
  parentDepartmentId: string | null
  parentDepartmentName: string | null
  headMemberId: string | null
  headMemberName: string | null
  businessUnit: string | null
  locationCountry: string | null
  payRegime: 'chile' | 'international' | null
  supervisorMemberId: string | null
  supervisorName: string | null
  visualParentNodeId: string | null
  visualParentLabel: string | null
  placementMode: 'department' | 'inferred_department' | 'root'
  depth: number
  directReportsCount: number
  subtreeSize: number
  memberCount: number
  childDepartmentCount: number
  active: boolean
  isRoot: boolean
  isCurrentMember: boolean
  isDirectReportToCurrentMember: boolean
  hasActiveDelegation: boolean
  isDepartmentHead: boolean
}

export interface HrOrgChartEdge {
  id: string
  source: string
  target: string
}

export interface HrOrgChartBreadcrumb {
  nodeId: string
  nodeType: 'department' | 'member'
  memberId: string | null
  departmentId: string | null
  label: string
}

export interface HrOrgChartMemberOption {
  memberId: string
  displayName: string
  roleTitle: string | null
  departmentName: string | null
  avatarUrl: string | null
  isCurrentMember: boolean
}

export interface HrOrgChartMemberContext {
  memberId: string
  focusNodeId: string | null
  renderedNodeId: string | null
  displayName: string
  publicEmail: string
  internalEmail: string | null
  avatarUrl: string | null
  roleTitle: string | null
  roleCategory: string
  departmentId: string | null
  departmentName: string | null
  contextDepartmentId: string | null
  contextDepartmentName: string | null
  supervisorMemberId: string | null
  supervisorName: string | null
  locationCountry: string | null
  payRegime: 'chile' | 'international' | null
  directReportsCount: number
  subtreeSize: number
  isCurrentMember: boolean
  isDirectReportToCurrentMember: boolean
  hasActiveDelegation: boolean
  isDepartmentHead: boolean
  placementMode: 'department' | 'inferred_department' | 'root'
}

export interface HrOrgChartResponse {
  accessMode: 'broad' | 'supervisor'
  currentMemberId: string | null
  focusMemberId: string | null
  focusNodeId: string | null
  nodes: HrOrgChartNode[]
  members: HrOrgChartMemberContext[]
  edges: HrOrgChartEdge[]
  breadcrumbs: HrOrgChartBreadcrumb[]
  memberOptions: HrOrgChartMemberOption[]
  summary: {
    totalNodes: number
    departments: number
    members: number
    roots: number
    maxDepth: number
    delegatedApprovals: number
  }
}

export interface HrHierarchyHistoryRecord {
  reportingLineId: string
  memberId: string
  memberName: string
  supervisorMemberId: string | null
  supervisorName: string | null
  previousSupervisorMemberId: string | null
  previousSupervisorName: string | null
  effectiveFrom: string
  effectiveTo: string | null
  sourceSystem: string
  changeReason: string
  changedByUserId: string | null
  changedByName: string | null
  createdAt: string
}

export interface HrHierarchyDelegationRecord {
  responsibilityId: string
  supervisorMemberId: string
  supervisorName: string | null
  delegateMemberId: string
  delegateMemberName: string | null
  effectiveFrom: string
  effectiveTo: string | null
  active: boolean
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface HrHierarchyHistoryResponse {
  history: HrHierarchyHistoryRecord[]
  delegations: HrHierarchyDelegationRecord[]
}

export type HrHierarchyGovernanceProposalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'dismissed'
  | 'auto_applied'

export type HrHierarchyGovernancePolicyAction =
  | 'review_required'
  | 'blocked_manual_precedence'
  | 'auto_apply_allowed'
  | 'no_action'

export type HrHierarchyGovernanceSeverity = 'info' | 'warning' | 'error'

export interface HrHierarchyGovernanceProposal {
  proposalId: string
  memberId: string
  memberName: string
  sourceSystem: string
  sourceSyncRunId: string | null
  sourceMemberId: string | null
  sourceMemberEmail: string | null
  sourceMemberName: string | null
  sourceSupervisorId: string | null
  sourceSupervisorEmail: string | null
  sourceSupervisorName: string | null
  currentSupervisorMemberId: string | null
  currentSupervisorName: string | null
  proposedSupervisorMemberId: string | null
  proposedSupervisorName: string | null
  currentReportingLineId: string | null
  status: HrHierarchyGovernanceProposalStatus
  driftKind: string
  policyAction: HrHierarchyGovernancePolicyAction
  severity: HrHierarchyGovernanceSeverity
  occurrenceCount: number
  firstDetectedAt: string
  lastDetectedAt: string
  resolvedAt: string | null
  resolvedByUserId: string | null
  resolutionNote: string | null
  evidence: Record<string, unknown>
  sourceSnapshot: Record<string, unknown>
}

export interface HrHierarchyGovernanceRunSummary {
  syncRunId: string
  status: string
  syncMode: string
  recordsRead: number
  proposalsDetected: number
  notes: string | null
  startedAt: string
  finishedAt: string | null
}

export interface HrHierarchyGovernanceResponse {
  policy: {
    canonicalSource: string
    externalSource: string
    precedence: string[]
  }
  lastRun: HrHierarchyGovernanceRunSummary | null
  summary: {
    pending: number
    approved: number
    rejected: number
    dismissed: number
    autoApplied: number
  }
  proposals: HrHierarchyGovernanceProposal[]
}

export interface HrLeaveBalancesResponse {
  balances: HrLeaveBalance[]
  policies?: HrLeavePolicy[]
  summary: {
    memberCount: number
    totalAvailableDays: number
  }
}

export interface HrLeaveRequestsResponse {
  requests: HrLeaveRequest[]
  summary: {
    total: number
    pendingSupervisor: number
    pendingHr: number
    approved: number
  }
}

export interface HrAttendanceResponse {
  records: HrAttendanceRecord[]
  summary: {
    total: number
    present: number
    late: number
    absent: number
    excused: number
  }
}

export interface CreateDepartmentInput {
  departmentId?: string
  name: string
  description?: string | null
  parentDepartmentId?: string | null
  headMemberId?: string | null
  businessUnit: string
  active?: boolean
  sortOrder?: number
}

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>

export interface UpdateHrMemberProfileInput {
  departmentId?: string | null
  reportsTo?: string | null
  jobLevel?: HrJobLevel | null
  hireDate?: string | null
  contractEndDate?: string | null
  employmentType?: HrEmploymentType | null
  dailyRequired?: boolean
  contractType?: ContractType | null
  deelContractId?: string | null
  identityDocumentType?: string | null
  identityDocumentNumber?: string | null
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  healthSystem?: HrHealthSystem | null
  isapreName?: string | null
  bankName?: string | null
  bankAccountType?: HrBankAccountType | null
  bankAccountNumber?: string | null
  cvUrl?: string | null
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  skills?: string[]
  tools?: string[]
  aiSuites?: string[]
  strengths?: string[]
  improvementAreas?: string[]
  pieceTypes?: string[]
  avgMonthlyVolume?: number | null
  throughputAvg30d?: number | null
  rpaAvg30d?: number | null
  otdPercent30d?: number | null
  notes?: string | null
}

export type LeaveDayPeriod = 'full_day' | 'morning' | 'afternoon'

export interface CreateLeaveRequestInput {
  memberId?: string
  leaveTypeCode: string
  startDate: string
  endDate: string
  startPeriod?: LeaveDayPeriod
  endPeriod?: LeaveDayPeriod
  requestedDays?: number | null
  reason?: string | null
  attachmentAssetId?: string | null
  attachmentUrl?: string | null
  notes?: string | null
}

export interface ReviewLeaveRequestInput {
  action: Extract<HrApprovalAction, 'approve' | 'reject' | 'cancel'>
  notes?: string | null
}

export interface RecordAttendanceInput {
  memberId?: string | null
  participantEmail?: string | null
  attendanceDate: string
  attendanceStatus: HrAttendanceStatus
  sourceSystem: string
  sourceReference?: string | null
  checkInAt?: string | null
  meetingJoinedAt?: string | null
  meetingLeftAt?: string | null
  minutesPresent?: number | null
  notes?: string | null
}
