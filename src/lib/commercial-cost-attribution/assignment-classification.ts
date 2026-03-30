export const COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION = '2026-03-30.v1'

const normalizeAssignmentValue = (value: string | null | undefined) => value?.trim().toLowerCase() || ''

export const INTERNAL_COMMERCIAL_CLIENT_IDS = [
  'efeonce_internal',
  'client_internal',
  'space-efeonce'
] as const

export const INTERNAL_COMMERCIAL_CLIENT_NAMES = [
  'efeonce internal',
  'efeonce'
] as const

const INTERNAL_COMMERCIAL_CLIENT_ID_SET = new Set<string>(INTERNAL_COMMERCIAL_CLIENT_IDS)
const INTERNAL_COMMERCIAL_CLIENT_NAME_SET = new Set<string>(INTERNAL_COMMERCIAL_CLIENT_NAMES)

export type CommercialCostAssignmentClassification =
  | 'commercial_billable'
  | 'commercial_non_billable'
  | 'internal_operational'
  | 'excluded_invalid'

export interface CommercialCostAssignmentInput {
  clientId?: string | null
  clientName?: string | null
  assignmentActive?: boolean | null
  fteAllocation?: number | string | null
  billable?: boolean | null
}

export interface CommercialCostAssignmentResolution {
  classification: CommercialCostAssignmentClassification
  normalizedClientId: string | null
  normalizedClientName: string | null
  isCommercial: boolean
  isBillableCommercial: boolean
  isInternalOperational: boolean
  shouldParticipateInCommercialAttribution: boolean
  exclusionReason: string | null
  ruleVersion: string
}

export const isInternalCommercialClientId = (clientId: string | null | undefined) =>
  INTERNAL_COMMERCIAL_CLIENT_ID_SET.has(normalizeAssignmentValue(clientId))

export const isInternalCommercialClientName = (clientName: string | null | undefined) =>
  INTERNAL_COMMERCIAL_CLIENT_NAME_SET.has(normalizeAssignmentValue(clientName))

export const isInternalCommercialAssignment = ({
  clientId,
  clientName
}: {
  clientId: string | null | undefined
  clientName?: string | null | undefined
}) => isInternalCommercialClientId(clientId) || isInternalCommercialClientName(clientName)

export const classifyAssignmentForCostAttribution = (
  input: CommercialCostAssignmentInput
): CommercialCostAssignmentResolution => {
  const normalizedClientId = normalizeAssignmentValue(input.clientId) || null
  const normalizedClientName = normalizeAssignmentValue(input.clientName) || null
  const assignmentActive = input.assignmentActive !== false

  const fteAllocation =
    typeof input.fteAllocation === 'string' && input.fteAllocation.trim()
      ? Number(input.fteAllocation)
      : typeof input.fteAllocation === 'number'
        ? input.fteAllocation
        : null

  if (!assignmentActive) {
    return {
      classification: 'excluded_invalid',
      normalizedClientId,
      normalizedClientName,
      isCommercial: false,
      isBillableCommercial: false,
      isInternalOperational: false,
      shouldParticipateInCommercialAttribution: false,
      exclusionReason: 'assignment_inactive',
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    }
  }

  if (!normalizedClientId && !normalizedClientName) {
    return {
      classification: 'excluded_invalid',
      normalizedClientId,
      normalizedClientName,
      isCommercial: false,
      isBillableCommercial: false,
      isInternalOperational: false,
      shouldParticipateInCommercialAttribution: false,
      exclusionReason: 'missing_client_reference',
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    }
  }

  if (isInternalCommercialAssignment({ clientId: normalizedClientId, clientName: normalizedClientName })) {
    return {
      classification: 'internal_operational',
      normalizedClientId,
      normalizedClientName,
      isCommercial: false,
      isBillableCommercial: false,
      isInternalOperational: true,
      shouldParticipateInCommercialAttribution: false,
      exclusionReason: 'internal_operational_assignment',
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    }
  }

  if (fteAllocation != null && Number.isFinite(fteAllocation) && fteAllocation <= 0) {
    return {
      classification: 'excluded_invalid',
      normalizedClientId,
      normalizedClientName,
      isCommercial: false,
      isBillableCommercial: false,
      isInternalOperational: false,
      shouldParticipateInCommercialAttribution: false,
      exclusionReason: 'non_positive_fte',
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    }
  }

  if (input.billable === false) {
    return {
      classification: 'commercial_non_billable',
      normalizedClientId,
      normalizedClientName,
      isCommercial: true,
      isBillableCommercial: false,
      isInternalOperational: false,
      shouldParticipateInCommercialAttribution: false,
      exclusionReason: 'commercial_non_billable_assignment',
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    }
  }

  return {
    classification: 'commercial_billable',
    normalizedClientId,
    normalizedClientName,
    isCommercial: true,
    isBillableCommercial: true,
    isInternalOperational: false,
    shouldParticipateInCommercialAttribution: true,
    exclusionReason: null,
    ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
  }
}

export const isCommercialAssignment = (input: CommercialCostAssignmentInput) =>
  classifyAssignmentForCostAttribution(input).isCommercial

export const isBillableCommercialAssignment = (input: CommercialCostAssignmentInput) =>
  classifyAssignmentForCostAttribution(input).isBillableCommercial
