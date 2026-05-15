import { GH_FINIQUITO } from '@/lib/copy/finiquito'

import {
  computeClosureCompleteness,
  derivePrimaryActionFromCompleteness,
  type ClosureCompletenessFacts
} from './closure-completeness'
import type {
  OffboardingClosureLane,
  OffboardingNextStep,
  OffboardingPrerequisiteStatus,
  OffboardingProgress,
  OffboardingWorkQueueActionCode,
  OffboardingWorkQueueActionDescriptor,
  OffboardingWorkQueueDocumentSummary,
  OffboardingWorkQueueFilter,
  OffboardingWorkQueueItem,
  OffboardingWorkQueueSeverity,
  OffboardingWorkQueueSettlementSummary,
  OffboardingWorkQueueSummary
} from './types'
import type { OffboardingCase } from '../types'

const copy = GH_FINIQUITO.resignation.workQueue

const ACTIVE_CASE_STATUSES = new Set(['draft', 'needs_review', 'approved', 'scheduled', 'blocked'])
const DOCUMENT_ACTIVE_STATUSES = new Set(['rendered', 'in_review', 'approved', 'issued'])

export const resolveOffboardingClosureLane = (item: OffboardingCase): OffboardingClosureLane => {
  if (item.ruleLane === 'internal_payroll' && item.countryCode === 'CL' && item.payrollViaSnapshot === 'internal') {
    return {
      code: 'final_settlement',
      label: copy.lane.finalSettlement,
      documentLabel: copy.lane.finalSettlement,
      allowsFinalSettlement: true,
      helpText: copy.lane.finalSettlementHelp
    }
  }

  if (item.ruleLane === 'non_payroll' || item.payrollViaSnapshot === 'none' || item.contractTypeSnapshot === 'honorarios') {
    return {
      code: 'contractual_close',
      label: copy.lane.contractualClose,
      documentLabel: copy.lane.contractualClose,
      allowsFinalSettlement: false,
      helpText: copy.lane.contractualCloseHelp
    }
  }

  if (item.ruleLane === 'external_payroll' || item.payrollViaSnapshot === 'deel' || item.relationshipType === 'eor') {
    return {
      code: 'external_provider',
      label: copy.lane.externalProvider,
      documentLabel: copy.lane.externalProvider,
      allowsFinalSettlement: false,
      helpText: copy.lane.externalProviderHelp
    }
  }

  return {
    code: 'needs_classification',
    label: copy.lane.needsClassification,
    documentLabel: copy.lane.needsClassification,
    allowsFinalSettlement: false,
    helpText: copy.lane.needsClassificationHelp
  }
}

export const deriveOffboardingPrerequisites = (
  item: OffboardingCase,
  closureLane: OffboardingClosureLane
): OffboardingPrerequisiteStatus => {
  const required = closureLane.allowsFinalSettlement && item.separationType === 'resignation'

  const resignationLetter = !required
    ? 'not_required'
    : item.resignationLetterAssetId
      ? 'attached'
      : 'missing'

  const maintenanceObligation = !required
    ? 'not_required'
    : item.maintenanceObligationJson?.variant === 'subject'
      ? 'subject'
      : item.maintenanceObligationJson?.variant === 'not_subject'
        ? 'not_subject'
        : 'missing'

  const blockingReasons: string[] = []

  if (resignationLetter === 'missing') blockingReasons.push(copy.blockers.resignationLetter)
  if (maintenanceObligation === 'missing') blockingReasons.push(copy.blockers.maintenance)

  return {
    required,
    resignationLetter,
    maintenanceObligation,
    blockingReasons
  }
}

const labelForNextStep = (code: OffboardingNextStep['code']) => {
  switch (code) {
    case 'upload_resignation_letter':
      return copy.nextStep.uploadResignationLetter
    case 'declare_maintenance':
      return copy.nextStep.declareMaintenance
    case 'calculate':
      return copy.nextStep.calculate
    case 'approve_calculation':
      return copy.nextStep.approveCalculation
    case 'render_document':
      return copy.nextStep.renderDocument
    case 'submit_document_review':
      return copy.nextStep.submitDocumentReview
    case 'approve_document':
      return copy.nextStep.approveDocument
    case 'issue_document':
      return copy.nextStep.issueDocument
    case 'register_ratification':
      return copy.nextStep.registerRatification
    case 'review_payment':
      return copy.nextStep.reviewPayment
    case 'external_provider_close':
      return copy.nextStep.externalProviderClose
    case 'classify_case':
      return copy.nextStep.classifyCase
    case 'completed':
      return copy.nextStep.completed
    case 'none':
    default:
      return copy.nextStep.none
  }
}

const actionLabel = (code: OffboardingWorkQueueActionCode) => {
  switch (code) {
    case 'transition_approve':
      return copy.actions.approveCase
    case 'transition_schedule':
      return copy.actions.scheduleCase
    case 'transition_execute':
      return copy.actions.executeCase
    case 'replace_resignation_letter':
      return copy.actions.replaceResignationLetter
    case 'edit_maintenance':
      return copy.actions.editMaintenance
    case 'reissue_document':
      return copy.actions.reissueDocument
    case 'download_pdf':
      return copy.actions.downloadPdf
    case 'reconcile_drift_action':
      // TASK-892 — label es-CL viene del closure-completeness step builder; el
      // descriptor lo provee inline. Esta rama es defensive (no se invoca por
      // `action(...)` factory path; closure-completeness construye su propio
      // descriptor).
      return copy.actions.reconcileDriftAction
    default:
      return labelForNextStep(code)
  }
}

const action = ({
  code,
  disabled = false,
  disabledReason = null,
  severity = 'info',
  href = null
}: {
  code: OffboardingWorkQueueActionCode
  disabled?: boolean
  disabledReason?: string | null
  severity?: OffboardingWorkQueueSeverity
  href?: string | null
}): OffboardingWorkQueueActionDescriptor => ({
  code,
  label: actionLabel(code),
  disabled,
  disabledReason,
  severity,
  href
})

const deriveNextStep = ({
  closureLane,
  prerequisites,
  settlement,
  document
}: {
  closureLane: OffboardingClosureLane
  prerequisites: OffboardingPrerequisiteStatus
  settlement: OffboardingWorkQueueSettlementSummary | null
  document: OffboardingWorkQueueDocumentSummary | null
}): OffboardingNextStep => {
  if (closureLane.code === 'contractual_close') {
    return { code: 'review_payment', label: labelForNextStep('review_payment'), severity: 'info' }
  }

  if (closureLane.code === 'external_provider') {
    return { code: 'external_provider_close', label: labelForNextStep('external_provider_close'), severity: 'info' }
  }

  if (closureLane.code === 'needs_classification') {
    return { code: 'classify_case', label: labelForNextStep('classify_case'), severity: 'warning' }
  }

  if (prerequisites.resignationLetter === 'missing') {
    return { code: 'upload_resignation_letter', label: labelForNextStep('upload_resignation_letter'), severity: 'warning' }
  }

  if (prerequisites.maintenanceObligation === 'missing') {
    return { code: 'declare_maintenance', label: labelForNextStep('declare_maintenance'), severity: 'warning' }
  }

  if (!settlement || settlement.calculationStatus === 'cancelled') {
    return { code: 'calculate', label: labelForNextStep('calculate'), severity: 'info' }
  }

  if (settlement.calculationStatus === 'draft') {
    return { code: 'calculate', label: labelForNextStep('calculate'), severity: 'info' }
  }

  if (settlement.calculationStatus === 'calculated' || settlement.calculationStatus === 'reviewed') {
    return { code: 'approve_calculation', label: labelForNextStep('approve_calculation'), severity: 'warning' }
  }

  if (!document || document.isHistoricalForLatestSettlement || document.documentStatus === 'cancelled') {
    return { code: 'render_document', label: labelForNextStep('render_document'), severity: 'info' }
  }

  if (document.documentStatus === 'rendered') {
    return { code: 'submit_document_review', label: labelForNextStep('submit_document_review'), severity: 'info' }
  }

  if (document.documentStatus === 'in_review') {
    return { code: 'approve_document', label: labelForNextStep('approve_document'), severity: 'warning' }
  }

  if (document.documentStatus === 'approved') {
    return { code: 'issue_document', label: labelForNextStep('issue_document'), severity: 'info' }
  }

  if (document.documentStatus === 'issued') {
    return { code: 'register_ratification', label: labelForNextStep('register_ratification'), severity: 'warning' }
  }

  if (document.documentStatus === 'signed_or_ratified') {
    return { code: 'completed', label: labelForNextStep('completed'), severity: 'success' }
  }

  return { code: 'none', label: labelForNextStep('none'), severity: 'neutral' }
}

const deriveProgress = ({
  closureLane,
  prerequisites,
  settlement,
  document,
  nextStep
}: {
  closureLane: OffboardingClosureLane
  prerequisites: OffboardingPrerequisiteStatus
  settlement: OffboardingWorkQueueSettlementSummary | null
  document: OffboardingWorkQueueDocumentSummary | null
  nextStep: OffboardingNextStep
}): OffboardingProgress => {
  if (!closureLane.allowsFinalSettlement) {
    const completed = closureLane.code === 'needs_classification' ? 1 : 2
    const total = 2

    return {
      completed,
      total,
      label: `${completed}/${total} ${copy.progress.done}`,
      nextStepHint: nextStep.label
    }
  }

  const checks = [
    true,
    !prerequisites.required || prerequisites.resignationLetter === 'attached',
    !prerequisites.required || prerequisites.maintenanceObligation !== 'missing',
    Boolean(settlement && ['approved', 'issued'].includes(settlement.calculationStatus)),
    Boolean(document && !document.isHistoricalForLatestSettlement && ['approved', 'issued', 'signed_or_ratified'].includes(document.documentStatus)),
    Boolean(document && document.documentStatus === 'signed_or_ratified')
  ]

  const completed = checks.filter(Boolean).length
  const total = checks.length

  return {
    completed,
    total,
    label: `${completed}/${total} ${copy.progress.done}`,
    nextStepHint: nextStep.label
  }
}

const deriveSecondaryActions = (
  item: OffboardingCase,
  prerequisites: OffboardingPrerequisiteStatus,
  settlement: OffboardingWorkQueueSettlementSummary | null,
  document: OffboardingWorkQueueDocumentSummary | null
) => {
  const secondary: OffboardingWorkQueueActionDescriptor[] = []

  if (item.status === 'needs_review') {
    secondary.push(action({ code: 'transition_approve', severity: 'info' }))
  }

  if (item.status === 'approved') {
    secondary.push(action({ code: 'transition_schedule', severity: 'info' }))
  }

  if (item.status === 'scheduled') {
    secondary.push(action({ code: 'transition_execute', severity: 'success' }))
  }

  if (prerequisites.resignationLetter === 'missing') {
    secondary.push(action({ code: 'upload_resignation_letter', severity: 'warning' }))
  } else if (prerequisites.resignationLetter === 'attached') {
    secondary.push(action({ code: 'replace_resignation_letter', severity: 'neutral' }))
  }

  if (prerequisites.maintenanceObligation === 'missing') {
    secondary.push(action({ code: 'declare_maintenance', severity: 'warning' }))
  } else if (prerequisites.maintenanceObligation === 'not_subject' || prerequisites.maintenanceObligation === 'subject') {
    secondary.push(action({ code: 'edit_maintenance', severity: 'neutral' }))
  }

  const canOperateDocument = Boolean(settlement && ['approved', 'issued'].includes(settlement.calculationStatus))

  const canReissueDocument = Boolean(
    canOperateDocument
      && document
      && !document.isHistoricalForLatestSettlement
      && DOCUMENT_ACTIVE_STATUSES.has(document.documentStatus)
  )

  if (canReissueDocument) {
    secondary.push(action({ code: 'reissue_document', severity: 'neutral' }))
  }

  if (document?.pdfAssetId) {
    secondary.push(action({
      code: 'download_pdf',
      severity: 'neutral',
      href: `/api/assets/private/${encodeURIComponent(document.pdfAssetId)}`
    }))
  }

  return secondary
}

const filtersFor = (
  item: OffboardingCase,
  closureLane: OffboardingClosureLane,
  nextStep: OffboardingNextStep,
  document: OffboardingWorkQueueDocumentSummary | null
) => {
  const filters: OffboardingWorkQueueFilter[] = ['all']

  if (nextStep.severity === 'warning' || nextStep.severity === 'error' || item.status === 'blocked') {
    filters.push('attention')
  }

  if (nextStep.code === 'calculate') filters.push('ready_to_calculate')
  if (document && !['signed_or_ratified', 'cancelled', 'voided'].includes(document.documentStatus)) filters.push('documents')
  if (!closureLane.allowsFinalSettlement) filters.push('no_labor_settlement')

  return filters
}

/**
 * Optional facts wired by `query.ts` from the canonical resolvers (Layer 2/3/4).
 * If omitted, closureCompleteness aggregate sees the relevant fields as `null`
 * and degrades honestly (sin generar reconcile_drift step).
 */
export interface OffboardingClosureFactsInput {
  memberRuntimeAligned?: boolean | null
  personRelationshipDrift?: boolean | null
  payrollExcluded?: boolean | null
}

export const buildOffboardingWorkQueueItem = ({
  item,
  collaborator,
  settlement,
  document,
  closureFacts
}: {
  item: OffboardingCase
  collaborator: OffboardingWorkQueueItem['collaborator']
  settlement: OffboardingWorkQueueSettlementSummary | null
  document: OffboardingWorkQueueDocumentSummary | null
  closureFacts?: OffboardingClosureFactsInput
}): OffboardingWorkQueueItem => {
  const closureLane = resolveOffboardingClosureLane(item)

  const latestDocument = document
    ? {
        ...document,
        isHistoricalForLatestSettlement: Boolean(settlement && document.finalSettlementId !== settlement.finalSettlementId)
      }
    : null

  const prerequisites = deriveOffboardingPrerequisites(item, closureLane)
  const nextStep = deriveNextStep({ closureLane, prerequisites, settlement, document: latestDocument })
  const progress = deriveProgress({ closureLane, prerequisites, settlement, document: latestDocument, nextStep })

  const legacyAction = nextStep.code === 'completed' || nextStep.code === 'none'
    ? null
    : action({
        code: nextStep.code,
        severity: nextStep.severity,
        disabled: nextStep.code === 'calculate' && prerequisites.blockingReasons.length > 0,
        disabledReason: nextStep.code === 'calculate' && prerequisites.blockingReasons.length > 0
          ? prerequisites.blockingReasons.join(' ')
          : null
      })

  // TASK-892 — compute canonical closure completeness aggregate (4 layers).
  const facts: ClosureCompletenessFacts = {
    caseStatus: item.status,
    nextStep,
    personRelationshipDrift: closureFacts?.personRelationshipDrift ?? null,
    memberRuntimeAligned: closureFacts?.memberRuntimeAligned ?? null,
    payrollExcluded: closureFacts?.payrollExcluded ?? null,
    caseLifecycleStepLabel: nextStep.label,
    caseLifecycleStepSeverity: nextStep.severity,
    memberId: item.memberId
  }

  const closureCompleteness = computeClosureCompleteness(facts)

  // TASK-892 — primaryAction se deriva de pendingSteps[0] cuando case está
  // terminal. Cuando case NO terminal, preserva semantica legacy del nextStep.
  const primaryAction = derivePrimaryActionFromCompleteness(closureCompleteness, legacyAction)

  const attentionReasons = [
    ...prerequisites.blockingReasons,
    latestDocument?.isHistoricalForLatestSettlement ? copy.blockers.historicalDocument : null,
    item.status === 'blocked' && item.blockedReason ? item.blockedReason : null
  ].filter(Boolean) as string[]

  return {
    case: item,
    collaborator,
    closureLane,
    latestSettlement: settlement,
    latestDocument,
    prerequisites,
    progress,
    nextStep,
    closureCompleteness,
    primaryAction,
    secondaryActions: deriveSecondaryActions(item, prerequisites, settlement, latestDocument),
    filters: filtersFor(item, closureLane, nextStep, latestDocument),
    attentionReasons
  }
}

export const buildOffboardingWorkQueueSummary = (items: OffboardingWorkQueueItem[]): OffboardingWorkQueueSummary => ({
  total: items.length,
  active: items.filter(item => ACTIVE_CASE_STATUSES.has(item.case.status)).length,
  attention: items.filter(item => item.filters.includes('attention')).length,
  readyToCalculate: items.filter(item => item.filters.includes('ready_to_calculate')).length,
  documents: items.filter(item => item.filters.includes('documents')).length,
  noLaborSettlement: items.filter(item => item.filters.includes('no_labor_settlement')).length,
  executed: items.filter(item => item.case.status === 'executed').length,
  blocked: items.filter(item => item.case.status === 'blocked').length
})
