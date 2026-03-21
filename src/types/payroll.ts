export type PayRegime = 'chile' | 'international'
export type PayrollCurrency = 'CLP' | 'USD'
export type PeriodStatus = 'draft' | 'calculated' | 'approved' | 'exported'
export type HealthSystem = 'fonasa' | 'isapre'
export type ContractType = 'indefinido' | 'plazo_fijo'
export type PayrollKpiDataSource = 'ico' | 'notion_ops' | 'manual'

export interface BonusProrationConfig {
  otdThreshold: number
  otdFloor: number
  rpaThreshold: number
}

export interface PayrollMemberSummary {
  memberId: string
  memberName: string
  memberEmail: string
  memberAvatarUrl: string | null
  notionUserId: string | null
  active: boolean
}

export interface PayrollCompensationMember extends PayrollMemberSummary {
  hasCurrentCompensation: boolean
  hasCompensationHistory: boolean
  compensationVersionCount: number
  currentCompensationVersionId: string | null
  currentCompensationEffectiveFrom: string | null
  currentPayRegime: PayRegime | null
  currentCurrency: PayrollCurrency | null
}

export interface CompensationVersion {
  versionId: string
  memberId: string
  memberName: string
  memberEmail: string
  memberAvatarUrl: string | null
  notionUserId: string | null
  version: number
  payRegime: PayRegime
  currency: PayrollCurrency
  baseSalary: number
  remoteAllowance: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  afpName: string | null
  afpRate: number | null
  healthSystem: HealthSystem | null
  healthPlanUf: number | null
  unemploymentRate: number
  contractType: ContractType
  hasApv: boolean
  apvAmount: number
  effectiveFrom: string
  effectiveTo: string | null
  isCurrent: boolean
  changeReason: string | null
  createdBy: string | null
  createdAt: string | null
}

export interface CreateCompensationVersionInput {
  memberId: string
  payRegime: PayRegime
  currency: PayrollCurrency
  baseSalary: number
  remoteAllowance?: number
  bonusOtdMin?: number
  bonusOtdMax?: number
  bonusRpaMin?: number
  bonusRpaMax?: number
  afpName?: string | null
  afpRate?: number | null
  healthSystem?: HealthSystem | null
  healthPlanUf?: number | null
  unemploymentRate?: number | null
  contractType?: ContractType
  hasApv?: boolean
  apvAmount?: number
  effectiveFrom: string
  changeReason: string
}

export interface UpdateCompensationVersionInput {
  payRegime: PayRegime
  currency: PayrollCurrency
  baseSalary: number
  remoteAllowance?: number
  bonusOtdMin?: number
  bonusOtdMax?: number
  bonusRpaMin?: number
  bonusRpaMax?: number
  afpName?: string | null
  afpRate?: number | null
  healthSystem?: HealthSystem | null
  healthPlanUf?: number | null
  unemploymentRate?: number | null
  contractType?: ContractType
  hasApv?: boolean
  apvAmount?: number
  effectiveFrom: string
  changeReason: string
}

export interface PayrollPeriod {
  periodId: string
  year: number
  month: number
  status: PeriodStatus
  calculatedAt: string | null
  calculatedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  exportedAt: string | null
  ufValue: number | null
  taxTableVersion: string | null
  notes: string | null
  createdAt: string | null
}

export interface CreatePayrollPeriodInput {
  year: number
  month: number
  ufValue?: number | null
  taxTableVersion?: string | null
  notes?: string | null
}

export interface UpdatePayrollPeriodInput {
  year?: number
  month?: number
  ufValue?: number | null
  taxTableVersion?: string | null
  notes?: string | null
}

export interface PayrollEntry {
  entryId: string
  periodId: string
  memberId: string
  memberName: string
  memberEmail: string
  memberAvatarUrl: string | null
  compensationVersionId: string
  payRegime: PayRegime
  currency: PayrollCurrency
  baseSalary: number
  remoteAllowance: number
  kpiOtdPercent: number | null
  kpiRpaAvg: number | null
  kpiOtdQualifies: boolean
  kpiRpaQualifies: boolean
  kpiTasksCompleted: number | null
  kpiDataSource: PayrollKpiDataSource
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
  bonusOtherDescription: string | null
  grossTotal: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  chileAfpName: string | null
  chileAfpRate: number | null
  chileAfpAmount: number | null
  chileHealthSystem: string | null
  chileHealthAmount: number | null
  chileUnemploymentRate: number | null
  chileUnemploymentAmount: number | null
  chileTaxableBase: number | null
  chileTaxAmount: number | null
  chileApvAmount: number | null
  chileUfValue: number | null
  chileTotalDeductions: number | null
  netTotalCalculated: number | null
  netTotalOverride: number | null
  netTotal: number
  manualOverride: boolean
  manualOverrideNote: string | null
  bonusOtdProrationFactor: number | null
  bonusRpaProrationFactor: number | null
  workingDaysInPeriod: number | null
  daysPresent: number | null
  daysAbsent: number | null
  daysOnLeave: number | null
  daysOnUnpaidLeave: number | null
  adjustedBaseSalary: number | null
  adjustedRemoteAllowance: number | null
  createdAt: string | null
  updatedAt: string | null
}

export interface UpdatePayrollEntryInput {
  bonusOtdAmount?: number
  bonusRpaAmount?: number
  bonusOtherAmount?: number
  bonusOtherDescription?: string | null
  chileTaxAmount?: number | null
  manualOverride?: boolean
  manualOverrideNote?: string | null
  netTotal?: number
  kpiOtdPercent?: number | null
  kpiRpaAvg?: number | null
  kpiTasksCompleted?: number | null
  kpiDataSource?: PayrollKpiDataSource
}

export interface PayrollKpiSnapshot {
  memberId: string
  otdPercent: number | null
  rpaAvg: number | null
  tasksCompleted: number
  dataSource: 'ico'
  sourceMode: 'materialized' | 'live'
}

export interface PayrollKpiDiagnostics {
  source: 'ico'
  strategy: 'materialized_first_with_live_fallback'
  periodYear: number
  periodMonth: number
  materializedMembers: number
  liveComputedMembers: number
  missingMembers: number
}

export interface PayrollCalculationResult {
  period: PayrollPeriod
  entries: PayrollEntry[]
  diagnostics: PayrollKpiDiagnostics
  missingKpiMemberIds: string[]
  missingCompensationMemberIds: string[]
}

export interface MemberPayrollHistory {
  memberId: string
  member: PayrollMemberSummary | null
  entries: PayrollEntry[]
  compensationHistory: CompensationVersion[]
}

export interface PayrollCompensationOverview {
  compensations: CompensationVersion[]
  eligibleMembers: PayrollCompensationMember[]
  members: PayrollCompensationMember[]
  summary: {
    activeMembers: number
    activeCompensations: number
    eligibleMembers: number
  }
}

export interface PayrollPeriodsResponse {
  periods: PayrollPeriod[]
  summary: {
    total: number
    draft: number
    calculated: number
    approved: number
    exported: number
  }
}

export interface PayrollEntriesResponse {
  entries: PayrollEntry[]
  summary: {
    total: number
    manualKpiEntries: number
    manualOverrideEntries: number
    totalGross: number
    totalNet: number
  }
}
