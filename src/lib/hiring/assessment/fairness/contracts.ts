/**
 * ⚠️ TASK-1754 Slice F — esta lista NO es el enum de etapas, y por eso sobrevivió al contract.
 *
 * `qualified`, `client_review` y `selected` ya no son etapas: las dos primeras se absorbieron en
 * `shortlisted` y la tercera pasó a ser un DESENLACE (`decision='selected'`, eje de TASK-1765).
 * Aun así se conservan acá, y la razón es concreta: `getSelectionFairness` usa
 * `input.stage ?? 'selected'` como DEFAULT, así que retirarlo haría que toda llamada sin etapa
 * explícita muriera en `hiring_fairness_stage_invalid`.
 *
 * Lo correcto es re-apuntar el cubo terminal al eje de desenlace, pero eso cambia QUÉ mide el
 * monitor —la tasa de selección final es justo el cociente que vigila el four-fifths rule— y no es
 * una decisión que corresponda tomar dentro de un contract de vocabulario. **Queda como deuda
 * declarada, no como descuido.** Estado real hoy: los tres literales tienen cero filas desde el
 * colapso, así que el cubo terminal ya no mide nada; `HIRING_FAIRNESS_MONITOR_ENABLED` está OFF en
 * producción, de modo que el hueco no está vivo. Follow-up: TASK-1365.
 */
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
