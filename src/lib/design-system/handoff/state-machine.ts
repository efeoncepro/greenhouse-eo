import type {
  DesignHandoffAllowedFileInput,
  DesignHandoffEvidenceInput,
  DesignHandoffEvidenceType,
  DesignHandoffImplementationStrategy,
  DesignHandoffImplementationEvidenceSummary,
  DesignHandoffLinkInput,
  DesignHandoffLinkType,
  DesignHandoffNodeSnapshot,
  DesignHandoffPlanningFields,
  DesignHandoffPrimitiveDecisionFields,
  DesignHandoffPriority,
  DesignHandoffStatus
} from './types'

export type DesignHandoffErrorCode =
  | 'invalid_figma_url'
  | 'figma_file_not_allowed'
  | 'design_handoff_not_found'
  | 'invalid_design_handoff_transition'
  | 'invalid_design_handoff_input'
  | 'invalid_allowed_file'
  | 'invalid_design_handoff_link'
  | 'invalid_design_handoff_evidence'
  | 'invalid_design_handoff_primitive_decision'
  | 'design_handoff_missing_evidence'
  | 'design_handoff_missing_primitive_decision'
  | 'design_handoff_node_unavailable'

export class DesignHandoffError extends Error {
  readonly code: DesignHandoffErrorCode

  constructor(code: DesignHandoffErrorCode, message: string) {
    super(message)
    this.name = 'DesignHandoffError'
    this.code = code
  }
}

const TRANSITIONS: Record<DesignHandoffStatus, readonly DesignHandoffStatus[]> = {
  proposed: ['in_implementation', 'archived'],
  in_implementation: ['in_review', 'archived'],
  in_review: ['implemented', 'archived'],
  implemented: ['archived'],
  archived: []
}

export const DESIGN_HANDOFF_STATUSES: readonly DesignHandoffStatus[] = [
  'proposed',
  'in_implementation',
  'in_review',
  'implemented',
  'archived'
]

export const DESIGN_HANDOFF_PRIORITIES: readonly DesignHandoffPriority[] = ['low', 'normal', 'high', 'urgent']

export const DESIGN_HANDOFF_IMPLEMENTATION_STRATEGIES: readonly DesignHandoffImplementationStrategy[] = [
  'route_only',
  'reuse_primitive',
  'extend_primitive',
  'new_primitive',
  'variant_kind',
  'research_required'
]

export const DESIGN_HANDOFF_LINK_TYPES: readonly DesignHandoffLinkType[] = [
  'task',
  'pull_request',
  'commit',
  'deployment',
  'route',
  'figma_comment',
  'external'
]

export const DESIGN_HANDOFF_EVIDENCE_TYPES: readonly DesignHandoffEvidenceType[] = [
  'gvc_capture',
  'runtime_route',
  'visual_review',
  'accessibility_review',
  'manual_exception'
]

export const isDesignHandoffStatus = (value: unknown): value is DesignHandoffStatus =>
  typeof value === 'string' && DESIGN_HANDOFF_STATUSES.includes(value as DesignHandoffStatus)

export const isDesignHandoffPriority = (value: unknown): value is DesignHandoffPriority =>
  typeof value === 'string' && DESIGN_HANDOFF_PRIORITIES.includes(value as DesignHandoffPriority)

export const isDesignHandoffImplementationStrategy = (value: unknown): value is DesignHandoffImplementationStrategy =>
  typeof value === 'string' && DESIGN_HANDOFF_IMPLEMENTATION_STRATEGIES.includes(value as DesignHandoffImplementationStrategy)

export const isDesignHandoffLinkType = (value: unknown): value is DesignHandoffLinkType =>
  typeof value === 'string' && DESIGN_HANDOFF_LINK_TYPES.includes(value as DesignHandoffLinkType)

export const isDesignHandoffEvidenceType = (value: unknown): value is DesignHandoffEvidenceType =>
  typeof value === 'string' && DESIGN_HANDOFF_EVIDENCE_TYPES.includes(value as DesignHandoffEvidenceType)

export const assertValidHandoffTransition = ({
  fromStatus,
  toStatus,
  implementedSurfaceKey,
  evidenceSummary,
  primitiveDecision
}: {
  fromStatus: DesignHandoffStatus
  toStatus: DesignHandoffStatus
  implementedSurfaceKey?: string | null
  evidenceSummary?: DesignHandoffImplementationEvidenceSummary | null
  primitiveDecision?: DesignHandoffPrimitiveDecisionFields | null
}) => {
  if (!TRANSITIONS[fromStatus]?.includes(toStatus)) {
    throw new DesignHandoffError(
      'invalid_design_handoff_transition',
      `Invalid design handoff transition: ${fromStatus} -> ${toStatus}`
    )
  }

  if (toStatus !== 'implemented') return

  const hasManualException = hasDesignHandoffEvidenceType(evidenceSummary, 'manual_exception')

  if (!implementedSurfaceKey?.trim()) {
    throw new DesignHandoffError(
      'invalid_design_handoff_transition',
      'Implemented design handoffs require an implemented surface key'
    )
  }

  if (
    !hasManualException &&
    !hasDesignHandoffEvidenceType(evidenceSummary, 'gvc_capture') &&
    !hasDesignHandoffEvidenceType(evidenceSummary, 'runtime_route')
  ) {
    throw new DesignHandoffError(
      'design_handoff_missing_evidence',
      'Implemented design handoffs require GVC capture or runtime route evidence'
    )
  }

  assertPrimitiveDecisionReadyForImplementation(primitiveDecision)
}

export const normalizeImplementedSurfaceKey = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim()

  if (!trimmed) return null

  const normalized = trimmed === '/' ? trimmed : trimmed.replace(/\/+$/, '')

  if (!normalized.startsWith('/') || normalized.includes('://')) {
    throw new DesignHandoffError('invalid_design_handoff_input', 'Implemented surface key must be an app route')
  }

  return normalized
}

export const normalizeDesignHandoffPriority = (value: unknown): DesignHandoffPriority => {
  if (value == null || value === '') return 'normal'

  if (!isDesignHandoffPriority(value)) {
    throw new DesignHandoffError('invalid_design_handoff_input', 'Invalid design handoff priority')
  }

  return value
}

export const normalizeDesignHandoffPlanningFields = (input: {
  priority?: unknown
  targetSurfaceKey?: string | null
  dueAt?: string | null
  blockedReason?: string | null
}): DesignHandoffPlanningFields => ({
  priority: normalizeDesignHandoffPriority(input.priority),
  targetSurfaceKey: normalizeImplementedSurfaceKey(input.targetSurfaceKey),
  dueAt: normalizeIsoDateTimeOrNull(input.dueAt, 'dueAt'),
  blockedReason: normalizeNullableText(input.blockedReason)
})

export const normalizeDesignHandoffPrimitiveDecisionFields = (input: {
  implementationStrategy?: unknown
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
}): Omit<DesignHandoffPrimitiveDecisionFields, 'primitiveDecisionUpdatedAt'> => {
  const strategyValue = input.implementationStrategy === '' ? null : input.implementationStrategy

  if (strategyValue != null && !isDesignHandoffImplementationStrategy(strategyValue)) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Invalid design handoff implementation strategy'
    )
  }

  const implementationStrategy = strategyValue ?? null
  const primitiveKey = normalizeNullableText(input.primitiveKey)
  const primitiveVariant = normalizeNullableText(input.primitiveVariant)
  const primitiveKind = normalizeNullableText(input.primitiveKind)
  const primitiveLabRoute = normalizeNullableRoute(input.primitiveLabRoute, 'primitiveLabRoute')
  const primitiveRuntimeRoute = normalizeNullableRoute(input.primitiveRuntimeRoute, 'primitiveRuntimeRoute')
  const primitiveGvcRef = normalizeNullableGvcRef(input.primitiveGvcRef)
  const primitiveDocsRef = normalizeNullableText(input.primitiveDocsRef)
  const primitiveRationale = normalizeNullableText(input.primitiveRationale)
  const primitiveDecisionOwner = normalizeNullableText(input.primitiveDecisionOwner)
  const primitiveDecisionDueAt = normalizeIsoDateTimeOrNull(input.primitiveDecisionDueAt, 'primitiveDecisionDueAt')

  const decision = {
    implementationStrategy,
    primitiveKey,
    primitiveVariant,
    primitiveKind,
    primitiveLabRoute,
    primitiveRuntimeRoute,
    primitiveGvcRef,
    primitiveDocsRef,
    primitiveRationale,
    primitiveDecisionOwner,
    primitiveDecisionDueAt
  }

  assertPrimitiveDecisionShape(decision)

  return decision
}

export const normalizeDesignHandoffLinkInput = (input: DesignHandoffLinkInput): DesignHandoffLinkInput => {
  if (!isDesignHandoffLinkType(input.linkType)) {
    throw new DesignHandoffError('invalid_design_handoff_link', 'Invalid design handoff link type')
  }

  let ref = normalizeRequiredText(input.ref, 'invalid_design_handoff_link', 'Design handoff link ref is required')
  const label = normalizeNullableText(input.label) ?? ref

  validateLinkRef(input.linkType, ref)

  if (input.linkType === 'route') {
    ref = normalizeImplementedSurfaceKey(ref) as string
  }

  return {
    linkType: input.linkType,
    ref,
    label,
    metadata: normalizeMetadata(input.metadata)
  }
}

export const normalizeDesignHandoffEvidenceInput = (
  input: DesignHandoffEvidenceInput
): DesignHandoffEvidenceInput => {
  if (!isDesignHandoffEvidenceType(input.evidenceType)) {
    throw new DesignHandoffError('invalid_design_handoff_evidence', 'Invalid design handoff evidence type')
  }

  let ref = normalizeRequiredText(input.ref, 'invalid_design_handoff_evidence', 'Design handoff evidence ref is required')
  const label = normalizeNullableText(input.label) ?? ref

  validateEvidenceRef(input.evidenceType, ref)

  if (input.evidenceType === 'runtime_route') {
    ref = normalizeImplementedSurfaceKey(ref) as string
  }

  return {
    evidenceType: input.evidenceType,
    ref,
    label,
    metadata: normalizeMetadata(input.metadata)
  }
}

export const normalizeDesignHandoffAllowedFileInput = (
  input: DesignHandoffAllowedFileInput
): DesignHandoffAllowedFileInput => {
  const fileKey = normalizeRequiredText(input.fileKey, 'invalid_allowed_file', 'Design handoff file key is required')

  const fileLabel = normalizeRequiredText(
    input.fileLabel,
    'invalid_allowed_file',
    'Design handoff file label is required'
  )

  const actorUserId = normalizeRequiredText(
    input.actorUserId,
    'invalid_design_handoff_input',
    'Design handoff actor is required'
  )

  if (!/^[A-Za-z0-9_-]{8,}$/.test(fileKey)) {
    throw new DesignHandoffError('invalid_allowed_file', 'Design handoff file key has an invalid shape')
  }

  return { fileKey, fileLabel, actorUserId }
}

export const hasDesignHandoffEvidenceType = (
  summary: DesignHandoffImplementationEvidenceSummary | null | undefined,
  evidenceType: DesignHandoffEvidenceType
): boolean => summary?.evidenceTypes.includes(evidenceType) ?? false

export const assertFreshDesignHandoffNodeSnapshot = (snapshot: DesignHandoffNodeSnapshot | null | undefined) => {
  if (!snapshot) return

  if (snapshot.nodeStatus === 'deleted' || snapshot.nodeStatus === 'stale') {
    throw new DesignHandoffError('design_handoff_node_unavailable', 'Design handoff Figma node is stale or deleted')
  }
}

export const assertPrimitiveDecisionReadyForImplementation = (
  decision: DesignHandoffPrimitiveDecisionFields | null | undefined
) => {
  if (!decision?.implementationStrategy || decision.implementationStrategy === 'research_required') {
    throw new DesignHandoffError(
      'design_handoff_missing_primitive_decision',
      'Implemented design handoffs require a resolved primitive governance decision'
    )
  }

  assertPrimitiveDecisionShape(decision, { implemented: true })
}

const assertPrimitiveDecisionShape = (
  decision: Omit<DesignHandoffPrimitiveDecisionFields, 'primitiveDecisionUpdatedAt'>,
  options: { implemented?: boolean } = {}
) => {
  const strategy = decision.implementationStrategy

  if (!strategy) return

  const needsPrimitiveKey = ['reuse_primitive', 'extend_primitive', 'new_primitive', 'variant_kind'].includes(strategy)

  if (needsPrimitiveKey && !decision.primitiveKey) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Primitive governance strategy requires a primitive key'
    )
  }

  if (strategy === 'variant_kind' && (!decision.primitiveVariant || !decision.primitiveKind)) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Variant/kind governance requires primitive variant and kind'
    )
  }

  if (strategy === 'route_only' && !decision.primitiveRationale) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Route-only governance requires rationale'
    )
  }

  if (strategy === 'research_required' && (!decision.primitiveDecisionOwner || !decision.primitiveDecisionDueAt)) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Research governance requires owner and due date'
    )
  }

  if (!options.implemented) return

  if (['extend_primitive', 'new_primitive'].includes(strategy) && !decision.primitiveLabRoute) {
    throw new DesignHandoffError(
      'design_handoff_missing_primitive_decision',
      'Primitive extensions require a Design System lab route before implementation closure'
    )
  }

  if (strategy === 'new_primitive' && (!decision.primitiveDocsRef || !decision.primitiveGvcRef)) {
    throw new DesignHandoffError(
      'design_handoff_missing_primitive_decision',
      'New primitives require docs and GVC evidence before implementation closure'
    )
  }
}

const normalizeRequiredText = (
  value: string | null | undefined,
  code: DesignHandoffErrorCode,
  message: string
): string => {
  const normalized = normalizeNullableText(value)

  if (!normalized) {
    throw new DesignHandoffError(code, message)
  }

  return normalized
}

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim()

  return trimmed ? trimmed : null
}

const normalizeIsoDateTimeOrNull = (value: string | null | undefined, fieldName: string): string | null => {
  const normalized = normalizeNullableText(value)

  if (!normalized) return null

  const time = Date.parse(normalized)

  if (Number.isNaN(time)) {
    throw new DesignHandoffError('invalid_design_handoff_input', `Invalid design handoff ${fieldName}`)
  }

  return new Date(time).toISOString()
}

const normalizeNullableRoute = (value: string | null | undefined, fieldName: string): string | null => {
  const normalized = normalizeNullableText(value)

  if (!normalized) return null

  try {
    return normalizeImplementedSurfaceKey(normalized)
  } catch {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      `Invalid design handoff ${fieldName}`
    )
  }
}

const normalizeNullableGvcRef = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableText(value)

  if (!normalized) return null

  if (!normalized.startsWith('.captures/')) {
    throw new DesignHandoffError(
      'invalid_design_handoff_primitive_decision',
      'Primitive governance GVC reference must use a .captures path'
    )
  }

  return normalized
}

const normalizeMetadata = (metadata: Record<string, unknown> | null | undefined): Record<string, unknown> =>
  metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}

const validateLinkRef = (linkType: DesignHandoffLinkType, ref: string) => {
  if (linkType === 'task' && !/^TASK-\d{3,5}$/.test(ref)) {
    throw new DesignHandoffError('invalid_design_handoff_link', 'Design handoff task links must use TASK-###')
  }

  if (linkType === 'route') {
    normalizeImplementedSurfaceKey(ref)

    return
  }

  if (linkType === 'commit' && !/^[a-f0-9]{7,40}$/i.test(ref)) {
    throw new DesignHandoffError('invalid_design_handoff_link', 'Design handoff commit links must use a Git SHA')
  }

  if (
    linkType === 'pull_request' ||
    linkType === 'deployment' ||
    linkType === 'figma_comment' ||
    linkType === 'external'
  ) {
    assertHttpUrl(ref, 'invalid_design_handoff_link', 'Design handoff link ref must be a URL')
  }
}

const validateEvidenceRef = (evidenceType: DesignHandoffEvidenceType, ref: string) => {
  if (evidenceType === 'runtime_route') {
    normalizeImplementedSurfaceKey(ref)

    return
  }

  if (evidenceType === 'gvc_capture' && !ref.startsWith('.captures/')) {
    throw new DesignHandoffError('invalid_design_handoff_evidence', 'GVC evidence must reference a .captures path')
  }

  if (
    evidenceType === 'visual_review' ||
    evidenceType === 'accessibility_review' ||
    evidenceType === 'manual_exception'
  ) {
    return
  }
}

const assertHttpUrl = (value: string, code: DesignHandoffErrorCode, message: string) => {
  try {
    const url = new URL(value)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol')
    }
  } catch {
    throw new DesignHandoffError(code, message)
  }
}
