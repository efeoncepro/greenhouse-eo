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
  carriedOverDays: number
  usedDays: number
  reservedDays: number
  availableDays: number
}

export interface HrLeaveRequest {
  requestId: string
  memberId: string
  memberName: string | null
  leaveTypeCode: string
  leaveTypeName: string
  startDate: string
  endDate: string
  requestedDays: number
  status: HrLeaveRequestStatus
  reason: string | null
  attachmentUrl: string | null
  supervisorMemberId: string | null
  supervisorName: string | null
  hrReviewerUserId: string | null
  decidedAt: string | null
  decidedBy: string | null
  notes: string | null
  createdAt: string | null
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
  departments: HrDepartment[]
  leaveTypes: HrLeaveType[]
  jobLevels: HrJobLevel[]
  employmentTypes: HrEmploymentType[]
  healthSystems: HrHealthSystem[]
  bankAccountTypes: HrBankAccountType[]
  leaveRequestStatuses: HrLeaveRequestStatus[]
  attendanceStatuses: HrAttendanceStatus[]
}

export interface HrDepartmentsResponse {
  departments: HrDepartment[]
  summary: {
    total: number
    active: number
  }
}

export interface HrLeaveBalancesResponse {
  balances: HrLeaveBalance[]
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

export interface CreateLeaveRequestInput {
  memberId?: string
  leaveTypeCode: string
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
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
