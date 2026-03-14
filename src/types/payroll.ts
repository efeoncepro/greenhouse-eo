export type PayRegime = 'chile' | 'international'
export type PayrollCurrency = 'CLP' | 'USD'
export type PeriodStatus = 'draft' | 'calculated' | 'approved' | 'exported'
export type HealthSystem = 'fonasa' | 'isapre'
export type ContractType = 'indefinido' | 'plazo_fijo'
export type PayrollKpiDataSource = 'notion_ops' | 'manual'

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
  notionUserId: string
  otdPercent: number | null
  rpaAvg: number | null
  tasksCompleted: number
  dataSource: 'notion_ops'
}

export interface PayrollKpiDiagnostics {
  canMatchByNotionUserId: boolean
  otdAutoAvailable: boolean
  identityColumn: string | null
  actualDateColumn: string | null
  deadlineColumn: string | null
  timeFilterColumn: string | null
}

export interface PayrollCalculationResult {
  period: PayrollPeriod
  entries: PayrollEntry[]
  diagnostics: PayrollKpiDiagnostics
  missingKpiMemberIds: string[]
}

export interface MemberPayrollHistory {
  memberId: string
  entries: PayrollEntry[]
  compensationHistory: CompensationVersion[]
}
