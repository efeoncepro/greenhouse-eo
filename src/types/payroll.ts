export type PayRegime = 'chile' | 'international'
export type PayrollCurrency = 'CLP' | 'USD'
export type PeriodStatus = 'draft' | 'calculated' | 'approved' | 'exported'
export type HealthSystem = 'fonasa' | 'isapre'
export type ContractType = 'indefinido' | 'plazo_fijo'
export type GratificacionLegalMode = 'mensual_25pct' | 'anual_proporcional' | 'ninguna'
export type PayrollKpiDataSource = 'ico' | 'notion_ops' | 'manual'
export type PayrollAttendanceSource = 'legacy_attendance_daily_plus_hr_leave' | 'microsoft_teams'
export type ProjectionMode = 'actual_to_date' | 'projected_month_end'

export interface BonusProrationConfig {
  otdThreshold: number
  otdFloor: number
  rpaThreshold: number
  rpaFullPayoutThreshold: number
  rpaSoftBandEnd: number
  rpaSoftBandFloorFactor: number
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
  colacionAmount: number
  movilizacionAmount: number
  fixedBonusLabel: string | null
  fixedBonusAmount: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  gratificacionLegalMode: GratificacionLegalMode
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
  colacionAmount?: number
  movilizacionAmount?: number
  fixedBonusLabel?: string | null
  fixedBonusAmount?: number
  bonusOtdMin?: number
  bonusOtdMax?: number
  bonusRpaMin?: number
  bonusRpaMax?: number
  gratificacionLegalMode?: GratificacionLegalMode
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
  colacionAmount?: number
  movilizacionAmount?: number
  fixedBonusLabel?: string | null
  fixedBonusAmount?: number
  bonusOtdMin?: number
  bonusOtdMax?: number
  bonusRpaMin?: number
  bonusRpaMax?: number
  gratificacionLegalMode?: GratificacionLegalMode
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
  colacionAmount: number
  movilizacionAmount: number
  fixedBonusLabel: string | null
  fixedBonusAmount: number
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
  chileGratificacionLegalAmount: number | null
  chileColacionAmount: number | null
  chileMovilizacionAmount: number | null
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
  adjustedColacionAmount: number | null
  adjustedMovilizacionAmount: number | null
  adjustedFixedBonusAmount: number | null
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

export interface PayrollProjectionContext {
  mode: ProjectionMode
  asOfDate: string
  promotionId?: string | null
}

export type PayrollReadinessIssueCode =
  | 'no_compensated_members'
  | 'missing_compensation'
  | 'missing_kpi'
  | 'missing_attendance_signal'
  | 'missing_uf_value'
  | 'missing_utm_value'
  | 'missing_tax_table_version'

export interface PayrollReadinessIssue {
  code: PayrollReadinessIssueCode
  severity: 'blocking' | 'warning'
  message: string
  memberIds?: string[]
}

export interface PayrollPeriodReadiness {
  periodId: string
  ready: boolean
  includedMemberIds: string[]
  missingCompensationMemberIds: string[]
  missingKpiMemberIds: string[]
  missingAttendanceMemberIds: string[]
  requiresUfValue: boolean
  attendanceDiagnostics: PayrollAttendanceDiagnostics
  warnings: PayrollReadinessIssue[]
  blockingIssues: PayrollReadinessIssue[]
}

export interface ProjectedPayrollPromotionRecord {
  promotionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  projectionMode: ProjectionMode
  asOfDate: string
  sourceSnapshotCount: number
  promotedEntryCount: number
  sourcePeriodStatus: PeriodStatus | null
  actorUserId: string | null
  actorIdentifier: string | null
  promotionStatus: 'started' | 'completed' | 'failed'
  promotedAt: string | null
  failureReason: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ProjectedPayrollPromotion {
  promotionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  projectionMode: 'actual_to_date' | 'projected_month_end'
  asOfDate: string
  sourceSnapshotCount: number
  promotedEntryCount: number
  promotedByUserId: string | null
  promotedByActor: string | null
  createdAt: string | null
}

export interface PromoteProjectedPayrollInput {
  year: number
  month: number
  mode: 'actual_to_date' | 'projected_month_end'
  actorIdentifier: string | null
}

export interface PayrollAttendanceDiagnostics {
  source: PayrollAttendanceSource
  integrationTarget: 'microsoft_teams'
  blocking: boolean
  notes: string[]
}

export interface PayrollCalculationResult {
  period: PayrollPeriod
  entries: PayrollEntry[]
  diagnostics: PayrollKpiDiagnostics
  attendanceDiagnostics: PayrollAttendanceDiagnostics
  missingKpiMemberIds: string[]
  missingCompensationMemberIds: string[]
}

export interface PayrollEntryExplain {
  entry: PayrollEntry
  period: PayrollPeriod
  compensationVersion: CompensationVersion | null
  calculation: {
    deductibleDays: number
    attendanceRatio: number | null
    effectiveBaseSalary: number
    effectiveRemoteAllowance: number
    effectiveFixedBonusAmount: number
    totalVariableBonus: number
    hasAttendanceAdjustment: boolean
    usesManualKpi: boolean
    usesManualOverride: boolean
    kpiSourceModeAvailable: boolean
    warnings: string[]
  }
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
