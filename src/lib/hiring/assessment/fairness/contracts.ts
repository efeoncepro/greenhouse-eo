export const FAIRNESS_REPORTABLE_STAGES = [
  'screening',
  'qualified',
  'shortlisted',
  'client_review',
  'interview',
  'decision_pending',
  'selected',
] as const

export type FairnessReportableStage = (typeof FAIRNESS_REPORTABLE_STAGES)[number]

export const FAIRNESS_K_ANONYMITY = 10
export const FAIRNESS_MIN_REPORTABLE_GROUPS = 2
export const FOUR_FIFTHS_THRESHOLD = 0.8
export const FAIRNESS_ADVERSE_IMPACT_SIGNAL = 'assessment.fairness.adverse_impact_detected' as const

export interface DemographicSelection {
  dimensionKey: string
  categoryKey: string
}

export interface CaptureVoluntaryDemographicSelfIdInput {
  identityProfileId: string
  applicationId: string
  consentGranted: true
  consentPolicyVersion: string
  selections: DemographicSelection[]
  actorKind: 'candidate_token' | 'system'
  actorUserId?: string | null
}

export interface CaptureVoluntaryDemographicSelfIdResult {
  recorded: number
  unchanged: number
  consentPolicyVersion: string
  retentionExpiresAt: string
}

export interface GetSelectionFairnessInput {
  stage?: FairnessReportableStage
  templateId?: string | null
  windowMonths?: number
}

export type FairnessVerdict = 'insufficient_sample' | 'monitoring' | 'adverse_impact'

export interface SelectionFairnessGroup {
  categoryKey: string
  eligibleCount: number
  advancedCount: number
  selectionRate: number
  impactRatio: number | null
  previousSelectionRate: number | null
  rateDrift: number | null
  impactRatioDrift: number | null
  adverseImpact: boolean
}

export interface SelectionFairnessDimension {
  dimensionKey: string
  referenceCategoryKey: string | null
  verdict: Exclude<FairnessVerdict, 'insufficient_sample'>
  groups: SelectionFairnessGroup[]
}

export interface SelectionFairnessReport {
  scope: {
    stage: FairnessReportableStage
    templateId: string | null
  }
  window: {
    months: number
    currentFrom: string
    currentTo: string
    previousFrom: string
    previousTo: string
  }
  privacy: {
    k: typeof FAIRNESS_K_ANONYMITY
    minimumReportableGroups: typeof FAIRNESS_MIN_REPORTABLE_GROUPS
    bucket: 'cohort_month'
  }
  sampleSize: number
  verdict: FairnessVerdict
  dimensions: SelectionFairnessDimension[]
  signal: {
    signalId: typeof FAIRNESS_ADVERSE_IMPACT_SIGNAL
    severity: 'warning'
    triggered: true
  } | null
  computedAt: string
}
