export type DesignHandoffKind = 'page' | 'component'

export type DesignHandoffStatus = 'proposed' | 'in_implementation' | 'in_review' | 'implemented' | 'archived'

export type DesignHandoffPriority = 'low' | 'normal' | 'high' | 'urgent'

export type DesignHandoffOwnerKind = 'designer' | 'dev'

export type DesignHandoffImplementationStrategy =
  | 'route_only'
  | 'reuse_primitive'
  | 'extend_primitive'
  | 'new_primitive'
  | 'variant_kind'
  | 'research_required'

export type DesignHandoffPrimitiveDecisionStatus = 'missing' | 'research' | 'warning' | 'ready'

export type DesignHandoffPrimitiveWarningCode =
  | 'primitive_decision_missing'
  | 'primitive_key_missing'
  | 'lab_route_missing'
  | 'runtime_route_missing'
  | 'gvc_evidence_missing'
  | 'route_only_reuse_suspect'
  | 'research_overdue'

export type DesignHandoffLinkType =
  | 'task'
  | 'pull_request'
  | 'commit'
  | 'deployment'
  | 'route'
  | 'figma_comment'
  | 'external'

export type DesignHandoffEvidenceType =
  | 'gvc_capture'
  | 'runtime_route'
  | 'visual_review'
  | 'accessibility_review'
  | 'manual_exception'

export type DesignHandoffNodeSnapshotStatus = 'reachable' | 'renamed' | 'deleted' | 'stale' | 'unavailable' | 'unknown'

export interface DesignHandoffPlanningFields {
  priority: DesignHandoffPriority
  targetSurfaceKey: string | null
  dueAt: string | null
  blockedReason: string | null
}

export interface DesignHandoffEntryLink {
  linkId: string
  entryId: string
  linkType: DesignHandoffLinkType
  label: string | null
  ref: string
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export interface DesignHandoffEntryEvidence {
  evidenceId: string
  entryId: string
  evidenceType: DesignHandoffEvidenceType
  label: string | null
  ref: string
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export interface DesignHandoffNodeSnapshot {
  snapshotId: string
  entryId: string
  fileKey: string
  nodeId: string
  expectedName: string | null
  observedName: string | null
  nodeStatus: DesignHandoffNodeSnapshotStatus
  renderUrl: string | null
  renderHash: string | null
  providerCheckedAt: string
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export interface DesignHandoffImplementationEvidenceSummary {
  evidenceTypes: readonly DesignHandoffEvidenceType[]
}

export interface DesignHandoffPrimitiveDecisionFields {
  implementationStrategy: DesignHandoffImplementationStrategy | null
  primitiveKey: string | null
  primitiveVariant: string | null
  primitiveKind: string | null
  primitiveLabRoute: string | null
  primitiveRuntimeRoute: string | null
  primitiveGvcRef: string | null
  primitiveDocsRef: string | null
  primitiveRationale: string | null
  primitiveDecisionOwner: string | null
  primitiveDecisionDueAt: string | null
  primitiveDecisionUpdatedAt: string | null
}

export interface DesignHandoffPrimitiveGovernance {
  decisionStatus: DesignHandoffPrimitiveDecisionStatus
  warnings: readonly DesignHandoffPrimitiveWarningCode[]
}

export interface DesignHandoffLinkInput {
  linkType: DesignHandoffLinkType
  ref: string
  label?: string | null
  metadata?: Record<string, unknown> | null
}

export interface DesignHandoffEvidenceInput {
  evidenceType: DesignHandoffEvidenceType
  ref: string
  label?: string | null
  metadata?: Record<string, unknown> | null
}

export interface DesignHandoffAllowedFileInput {
  fileKey: string
  fileLabel: string
  actorUserId: string
  metadata?: Record<string, unknown> | null
}

export interface DeprecateDesignHandoffAllowedFileInput {
  fileKey: string
  actorUserId: string
}

export interface DesignHandoffAllowedFile {
  fileKey: string
  fileLabel: string
  addedBy: string
  addedAt: string
  supersededAt: string | null
}

export interface DesignHandoffEntry {
  entryId: string
  title: string
  kind: DesignHandoffKind
  fileKey: string
  fileLabel: string | null
  nodeId: string
  nodeName: string | null
  status: DesignHandoffStatus
  implementedSurfaceKey: string | null
  priority: DesignHandoffPriority
  targetSurfaceKey: string | null
  dueAt: string | null
  blockedReason: string | null
  implementationStrategy: DesignHandoffImplementationStrategy | null
  primitiveKey: string | null
  primitiveVariant: string | null
  primitiveKind: string | null
  primitiveLabRoute: string | null
  primitiveRuntimeRoute: string | null
  primitiveGvcRef: string | null
  primitiveDocsRef: string | null
  primitiveRationale: string | null
  primitiveDecisionOwner: string | null
  primitiveDecisionDueAt: string | null
  primitiveDecisionUpdatedAt: string | null
  primitiveGovernance?: DesignHandoffPrimitiveGovernance
  designerOwnerMemberId: string | null
  devOwnerMemberId: string | null
  links?: readonly DesignHandoffEntryLink[]
  evidence?: readonly DesignHandoffEntryEvidence[]
  latestNodeSnapshot?: DesignHandoffNodeSnapshot | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CreateDesignHandoffEntryInput {
  title?: string
  kind?: DesignHandoffKind
  url: string
  nodeName?: string | null
  actorUserId: string
}

export interface TransitionDesignHandoffEntryInput {
  entryId: string
  toStatus: DesignHandoffStatus
  implementedSurfaceKey?: string | null
  evidenceSummary?: DesignHandoffImplementationEvidenceSummary | null
  actorUserId: string
}

export interface AssignDesignHandoffOwnerInput {
  entryId: string
  ownerKind: DesignHandoffOwnerKind
  memberId: string | null
  actorUserId: string
}

export interface SetDesignHandoffPlanningFieldsInput {
  entryId: string
  priority?: DesignHandoffPriority
  targetSurfaceKey?: string | null
  dueAt?: string | null
  blockedReason?: string | null
  actorUserId: string
}

export interface SetDesignHandoffPrimitiveDecisionInput {
  entryId: string
  implementationStrategy?: DesignHandoffImplementationStrategy | null
  primitiveKey?: string | null
  primitiveVariant?: string | null
  primitiveKind?: string | null
  primitiveLabRoute?: string | null
  primitiveRuntimeRoute?: string | null
  primitiveGvcRef?: string | null
  primitiveDocsRef?: string | null
  primitiveRationale?: string | null
  primitiveDecisionOwner?: string | null
  primitiveDecisionDueAt?: string | null
  actorUserId: string
}

export interface LinkDesignHandoffWorkItemInput extends DesignHandoffLinkInput {
  entryId: string
  actorUserId: string
}

export interface AttachDesignHandoffEvidenceInput extends DesignHandoffEvidenceInput {
  entryId: string
  actorUserId: string
}

export interface VerifyDesignHandoffFigmaNodeInput {
  entryId: string
  actorUserId: string
}

export interface DesignHandoffTransitionResult {
  entry: DesignHandoffEntry
  fromStatus: DesignHandoffStatus
  eventType: 'transitioned' | 'archived'
}
