export const SERVICE_SLA_INDICATOR_CODES = [
  'otd_pct',
  'rpa_avg',
  'ftr_pct',
  'revision_rounds',
  'ttm_days'
] as const

export type ServiceSlaIndicatorCode = (typeof SERVICE_SLA_INDICATOR_CODES)[number]

export const SERVICE_SLA_COMPARISON_MODES = ['at_least', 'at_most'] as const

export type ServiceSlaComparisonMode = (typeof SERVICE_SLA_COMPARISON_MODES)[number]

export const SERVICE_SLA_UNITS = ['percent', 'ratio', 'rounds', 'days'] as const

export type ServiceSlaUnit = (typeof SERVICE_SLA_UNITS)[number]

export const SERVICE_SLA_COMPLIANCE_STATUSES = [
  'met',
  'at_risk',
  'breached',
  'source_unavailable',
  'no_sla_defined'
] as const

export type ServiceSlaComplianceStatus = (typeof SERVICE_SLA_COMPLIANCE_STATUSES)[number]

export const SERVICE_SLA_SOURCE_STATUSES = [
  'ready',
  'source_unavailable',
  'insufficient_linkage',
  'insufficient_sample',
  'not_applicable'
] as const

export type ServiceSlaSourceStatus = (typeof SERVICE_SLA_SOURCE_STATUSES)[number]

export const SERVICE_SLA_TREND_STATUSES = ['improving', 'stable', 'degrading', 'unknown'] as const

export type ServiceSlaTrendStatus = (typeof SERVICE_SLA_TREND_STATUSES)[number]

export type ServiceSlaDefinition = {
  definitionId: string
  serviceId: string
  spaceId: string
  indicatorCode: ServiceSlaIndicatorCode
  indicatorFormula: string
  measurementSource: string
  comparisonMode: ServiceSlaComparisonMode
  unit: ServiceSlaUnit
  sliLabel: string | null
  sloTargetValue: number
  slaTargetValue: number
  breachThreshold: number | null
  warningThreshold: number | null
  displayOrder: number
  active: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type UpsertServiceSlaDefinitionInput = {
  definitionId?: string
  indicatorCode: ServiceSlaIndicatorCode
  indicatorFormula: string
  measurementSource: string
  comparisonMode: ServiceSlaComparisonMode
  unit: ServiceSlaUnit
  sliLabel?: string | null
  sloTargetValue: number
  slaTargetValue: number
  breachThreshold?: number | null
  warningThreshold?: number | null
  displayOrder?: number
  active?: boolean
}

export type ServiceSlaEvidence = {
  sourceLabel: string
  sourcePeriodLabel?: string | null
  reasons: string[]
  meta?: Record<string, unknown>
}

export type ServiceSlaComplianceItem = {
  definition: ServiceSlaDefinition
  complianceStatus: ServiceSlaComplianceStatus
  sourceStatus: ServiceSlaSourceStatus
  trendStatus: ServiceSlaTrendStatus
  actualValue: number | null
  deltaToTarget: number | null
  confidenceLevel: 'high' | 'medium' | 'low' | 'none' | null
  sourcePeriodYear: number | null
  sourcePeriodMonth: number | null
  evaluatedAt: string
  evidence: ServiceSlaEvidence
}

export type ServiceSlaOverallStatus =
  | 'healthy'
  | 'at_risk'
  | 'breached'
  | 'partial'
  | 'no_sla_defined'

export type ServiceSlaComplianceReport = {
  serviceId: string
  spaceId: string
  evaluatedAt: string
  overallStatus: ServiceSlaOverallStatus
  summary: {
    totalDefinitions: number
    metCount: number
    atRiskCount: number
    breachedCount: number
    sourceUnavailableCount: number
  }
  items: ServiceSlaComplianceItem[]
}

export type ServiceSlaComplianceSnapshotRecord = {
  snapshotId: string
  definitionId: string
  serviceId: string
  spaceId: string
  indicatorCode: ServiceSlaIndicatorCode
  comparisonMode: ServiceSlaComparisonMode
  unit: ServiceSlaUnit
  complianceStatus: ServiceSlaComplianceStatus
  sourceStatus: ServiceSlaSourceStatus
  trendStatus: ServiceSlaTrendStatus
  actualValue: number | null
  sloTargetValue: number
  slaTargetValue: number
  breachThreshold: number | null
  warningThreshold: number | null
  deltaToTarget: number | null
  confidenceLevel: 'high' | 'medium' | 'low' | 'none' | null
  sourcePeriodYear: number | null
  sourcePeriodMonth: number | null
  evidence: Record<string, unknown>
  evaluatedAt: string
}
