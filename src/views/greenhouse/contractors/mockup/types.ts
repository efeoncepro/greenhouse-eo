export type ContractorScenarioId =
  | 'honorarios_ready'
  | 'submitted_review'
  | 'disputed'
  | 'international_blocked'
  | 'paid'
  | 'closure_pending'

export type ContractorTone = 'success' | 'warning' | 'error' | 'info' | 'secondary'

export interface ContractorTimelineStep {
  id: string
  label: string
  detail: string
  status: 'done' | 'current' | 'blocked' | 'upcoming'
  timestamp?: string
}

export interface ContractorSupportItem {
  id: string
  label: string
  kind: 'invoice' | 'evidence' | 'tax' | 'provider'
  status: string
  tone: ContractorTone
  filename?: string
}

export interface ContractorSubmissionItem {
  id: string
  title: string
  period: string
  amount: number
  currency: 'CLP' | 'USD'
  status: string
  tone: ContractorTone
  responsable: string
  nextAction: string
}

export interface ContractorScenario {
  id: ContractorScenarioId
  label: string
  eyebrow: string
  title: string
  summary: string
  primaryAction: string
  primaryActionIcon: string
  primaryActionDisabled?: boolean
  primaryActionReason?: string
  secondaryAction: string
  secondaryHref: string
  contractorName: string
  engagementPublicId: string
  relationshipSubtype: string
  country: string
  currency: 'CLP' | 'USD'
  paymentCurrency: 'CLP' | 'USD'
  servicePeriod: string
  paymentModel: string
  paymentCadence: string
  taxResponsable: string
  readinessLabel: string
  readinessTone: ContractorTone
  readinessDetail: string
  paymentProfileLabel: string
  paymentProfileDetail: string
  kpis: Array<{
    id: string
    title: string
    value: string
    subtitle: string
    tone: ContractorTone
    icon: string
  }>
  supportItems: ContractorSupportItem[]
  submissions: ContractorSubmissionItem[]
  timeline: ContractorTimelineStep[]
  blockers: Array<{
    id: string
    title: string
    detail: string
    tone: ContractorTone
    responsable: string
  }>
}
