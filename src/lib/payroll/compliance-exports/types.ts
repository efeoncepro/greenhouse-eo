export type ChileComplianceExportKind = 'previred' | 'lre'

export interface ChileComplianceSpec {
  kind: ChileComplianceExportKind
  specVersion: string
  sourceUrl: string
  sourceSha256: string
  validatedAsOf: string
  delimiter: ';'
  encoding: 'plain-text-ascii'
}

export interface ChileComplianceValidationResult {
  status: 'passed' | 'failed'
  errors: string[]
}

export interface ChilePayrollComplianceEntry {
  entryId: string
  periodId: string
  memberId: string
  memberDisplayName: string
  memberFirstName: string | null
  memberLastName: string | null
  memberLegalName: string | null
  memberEmail: string | null
  identityProfileId: string
  employmentType: string | null
  previredSexCode: string | null
  previredNationalityCode: string | null
  previredHealthInstitutionCode: string | null
  previredAfpTotalRate: number | null
  previredSisRate: number | null
  rutNormalized: string
  contractTypeSnapshot: string | null
  payRegime: string
  payrollVia: string | null
  currency: string
  baseSalary: number
  grossTotal: number
  netTotal: number
  chileAfpName: string | null
  chileAfpAmount: number
  chileAfpCotizacionAmount: number
  chileAfpComisionAmount: number
  chileHealthSystem: string | null
  chileHealthAmount: number
  chileHealthObligatoriaAmount: number
  chileHealthVoluntariaAmount: number
  chileUnemploymentAmount: number
  chileTaxAmount: number
  chileApvAmount: number
  chileEmployerSisAmount: number
  chileEmployerCesantiaAmount: number
  chileEmployerMutualAmount: number
  chileTotalDeductions: number
  chileTaxableBase: number
  workingDaysInPeriod: number | null
  daysAbsent: number | null
  daysOnLeave: number | null
  daysOnUnpaidLeave: number | null
}

export interface ChileCompliancePeriodSnapshot {
  periodId: string
  year: number
  month: number
  status: string
  generatedBy: string | null
  spaceId: string | null
  entries: ChilePayrollComplianceEntry[]
  sourceSnapshotHash: string
}

export interface ChileComplianceArtifact {
  kind: ChileComplianceExportKind
  spec: ChileComplianceSpec
  filename: string
  contentType: string
  encoding: ChileComplianceSpec['encoding']
  text: string
  artifactSha256: string
  recordCount: number
  totals: Record<string, number | string>
  validation: ChileComplianceValidationResult
}
