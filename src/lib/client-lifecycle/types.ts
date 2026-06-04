// TASK-992 — Client Lifecycle Orchestrator types (GREENHOUSE_CLIENT_LIFECYCLE_V1).
// Pure types + domain error + state-machine constants. NOT server-only — safe in
// client + server. The store/commands live in server-only modules.

export type ClientLifecycleCaseKind = 'onboarding' | 'offboarding' | 'reactivation'

export type ClientLifecycleCaseStatus =
  | 'draft'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled'

export type ClientLifecycleTriggerSource =
  | 'hubspot_deal'
  | 'manual'
  | 'renewal'
  | 'churn_signal'
  | 'migration'
  | 'adopt'

export type ClientLifecycleItemStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked'
  | 'not_applicable'

export type ClientLifecycleOwnerRole =
  | 'commercial'
  | 'finance'
  | 'operations'
  | 'hr'
  | 'identity'
  | 'it'

export interface ClientLifecycleCase {
  caseId: string
  organizationId: string
  clientId: string | null
  caseKind: ClientLifecycleCaseKind
  status: ClientLifecycleCaseStatus
  triggerSource: ClientLifecycleTriggerSource
  triggeredByUserId: string | null
  reason: string | null
  effectiveDate: string
  targetCompletionDate: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  blockedReasonCodes: string[]
  previousCaseId: string | null
  templateCode: string
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ClientLifecycleChecklistItem {
  itemId: string
  caseId: string
  templateCode: string
  itemCode: string
  itemLabel: string
  required: boolean
  blocksCompletion: boolean
  requiresEvidence: boolean
  ownerRole: ClientLifecycleOwnerRole
  displayOrder: number
  status: ClientLifecycleItemStatus
  evidenceAssetId: string | null
  notes: string | null
  completedAt: string | null
  completedByUserId: string | null
  blockedReason: string | null
  metadataJson: Record<string, unknown>
}

export interface ClientLifecycleCaseEvent {
  eventId: string
  caseId: string
  eventKind: string
  fromStatus: string | null
  toStatus: string | null
  payloadJson: Record<string, unknown>
  actorUserId: string | null
  occurredAt: string
}

export interface ClientLifecycleTemplateItem {
  templateCode: string
  caseKind: ClientLifecycleCaseKind
  itemCode: string
  itemLabel: string
  required: boolean
  defaultOrder: number
  ownerRole: ClientLifecycleOwnerRole
  blocksCompletion: boolean
  requiresEvidence: boolean
}

export interface ClientLifecycleChecklistSnapshot {
  itemId: string
  itemCode: string
  status: ClientLifecycleItemStatus
  displayOrder: number
}

export interface ProvisionClientLifecycleResult {
  caseId: string
  status: Extract<ClientLifecycleCaseStatus, 'draft' | 'in_progress'>
  checklistItems: ClientLifecycleChecklistSnapshot[]
  blockers: string[]
  idempotent: boolean
}

export interface AdvanceChecklistItemResult {
  itemId: string
  status: ClientLifecycleItemStatus
  caseStatus: ClientLifecycleCaseStatus
}

export interface ResolveLifecycleCaseResult {
  caseId: string
  finalStatus: Extract<ClientLifecycleCaseStatus, 'completed' | 'cancelled'>
  sideEffectsTriggered: string[]
  idempotent: boolean
}

export interface BlockerMutationResult {
  caseId: string
  status: ClientLifecycleCaseStatus
  blockedReasonCodes: string[]
}

// Canonical template per case_kind (V1.0 onboarding only is implemented).
export const DEFAULT_TEMPLATE_BY_KIND: Record<ClientLifecycleCaseKind, string> = {
  onboarding: 'standard_onboarding_v1',
  offboarding: 'standard_offboarding_v1',
  reactivation: 'reactivation_v1'
}

export class ClientLifecycleValidationError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ClientLifecycleValidationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}
