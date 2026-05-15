import type { FinalSettlementReadinessStatus, FinalSettlementStatus } from '@/lib/payroll/final-settlement'
import type { FinalSettlementDocumentStatus } from '@/lib/payroll/final-settlement/document-types'

import type { OffboardingCase, OffboardingCaseListFilters } from '../types'

import type { OffboardingClosureCompleteness } from './closure-completeness'

export type OffboardingClosureLaneCode =
  | 'final_settlement'
  | 'contractual_close'
  | 'external_provider'
  | 'needs_classification'

export type OffboardingWorkQueueSeverity = 'neutral' | 'info' | 'warning' | 'error' | 'success'

export type OffboardingPrerequisiteState =
  | 'not_required'
  | 'missing'
  | 'attached'
  | 'not_subject'
  | 'subject'

export type OffboardingNextStepCode =
  | 'upload_resignation_letter'
  | 'declare_maintenance'
  | 'calculate'
  | 'approve_calculation'
  | 'render_document'
  | 'submit_document_review'
  | 'approve_document'
  | 'issue_document'
  | 'register_ratification'
  | 'review_payment'
  | 'external_provider_close'
  | 'classify_case'
  | 'completed'
  | 'none'

export type OffboardingWorkQueueActionCode =
  | OffboardingNextStepCode
  | 'transition_approve'
  | 'transition_schedule'
  | 'transition_execute'
  | 'replace_resignation_letter'
  | 'edit_maintenance'
  | 'reissue_document'
  | 'download_pdf'
  | 'reconcile_drift_action'

export type OffboardingWorkQueueFilter =
  | 'all'
  | 'attention'
  | 'ready_to_calculate'
  | 'documents'
  | 'no_labor_settlement'

export interface OffboardingWorkQueueCollaborator {
  memberId: string | null
  displayName: string | null
  primaryEmail: string | null
  roleTitle: string | null
}

export interface OffboardingClosureLane {
  code: OffboardingClosureLaneCode
  label: string
  documentLabel: string
  allowsFinalSettlement: boolean
  helpText: string | null
}

export interface OffboardingWorkQueueSettlementSummary {
  finalSettlementId: string
  settlementVersion: number
  calculationStatus: FinalSettlementStatus
  readinessStatus: FinalSettlementReadinessStatus
  readinessHasBlockers: boolean
  netPayable: number
  currency: 'CLP'
  calculatedAt: string | null
  approvedAt: string | null
}

export interface OffboardingWorkQueueDocumentSummary {
  finalSettlementDocumentId: string
  finalSettlementId: string
  settlementVersion: number
  documentVersion: number
  documentStatus: FinalSettlementDocumentStatus
  readinessStatus: 'ready' | 'needs_review' | 'blocked'
  readinessHasBlockers: boolean
  pdfAssetId: string | null
  isHistoricalForLatestSettlement: boolean
  issuedAt: string | null
  signedOrRatifiedAt: string | null
}

export interface OffboardingPrerequisiteStatus {
  required: boolean
  resignationLetter: OffboardingPrerequisiteState
  maintenanceObligation: OffboardingPrerequisiteState
  blockingReasons: string[]
}

export interface OffboardingProgress {
  completed: number
  total: number
  label: string
  nextStepHint: string | null
}

export interface OffboardingNextStep {
  code: OffboardingNextStepCode
  label: string
  severity: OffboardingWorkQueueSeverity
}

export interface OffboardingWorkQueueActionDescriptor {
  code: OffboardingWorkQueueActionCode
  label: string
  disabled: boolean
  disabledReason: string | null
  severity: OffboardingWorkQueueSeverity
  href: string | null
}

export interface OffboardingWorkQueueItem {
  case: OffboardingCase
  collaborator: OffboardingWorkQueueCollaborator
  closureLane: OffboardingClosureLane
  latestSettlement: OffboardingWorkQueueSettlementSummary | null
  latestDocument: OffboardingWorkQueueDocumentSummary | null
  prerequisites: OffboardingPrerequisiteStatus
  progress: OffboardingProgress
  nextStep: OffboardingNextStep
  /**
   * TASK-892 — aggregate canonical de cierre (4 capas ortogonales).
   * UI lee `closureCompleteness.closureState` y `pendingSteps[]` para
   * mostrar el estado real del case y derivar el primaryAction.
   */
  closureCompleteness: OffboardingClosureCompleteness
  primaryAction: OffboardingWorkQueueActionDescriptor | null
  secondaryActions: OffboardingWorkQueueActionDescriptor[]
  filters: OffboardingWorkQueueFilter[]
  attentionReasons: string[]
}

export interface OffboardingWorkQueueSummary {
  total: number
  active: number
  attention: number
  readyToCalculate: number
  documents: number
  noLaborSettlement: number
  executed: number
  blocked: number
}

export interface OffboardingWorkQueue {
  items: OffboardingWorkQueueItem[]
  summary: OffboardingWorkQueueSummary
  generatedAt: string
  degradedReasons: string[]
}

export type OffboardingWorkQueueFilters = OffboardingCaseListFilters
