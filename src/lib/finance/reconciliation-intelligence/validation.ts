import type {
  ReconciliationAiAction,
  ReconciliationAiEvidenceFactor,
  ReconciliationAiProposedAction,
  ReconciliationAiSimulation,
  ReconciliationAiSuggestionPayload,
  ReconciliationAiSuggestionType
} from './types'

const VALID_TYPES: ReadonlySet<ReconciliationAiSuggestionType> = new Set([
  'match',
  'group_match',
  'drift_explanation',
  'import_mapping',
  'closure_review',
  'anomaly'
])

const VALID_ACTIONS: ReadonlySet<ReconciliationAiAction> = new Set([
  'open_match_dialog',
  'suggest_group',
  'explain_drift',
  'review_before_close',
  'normalize_import',
  'no_action'
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const asStringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim())
  : []

const parseProposedAction = (value: unknown): ReconciliationAiProposedAction => {
  if (!isRecord(value)) {
    return { action: 'no_action', targetIds: [], payload: {} }
  }

  const action = typeof value.action === 'string' && VALID_ACTIONS.has(value.action as ReconciliationAiAction)
    ? value.action as ReconciliationAiAction
    : 'no_action'

  return {
    action,
    targetIds: asStringArray(value.targetIds),
    payload: isRecord(value.payload) ? value.payload : {}
  }
}

const parseEvidenceFactors = (value: unknown): ReconciliationAiEvidenceFactor[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .map(item => ({
      factor: typeof item.factor === 'string' ? item.factor.slice(0, 80) : 'evidence',
      weight: clamp(typeof item.weight === 'number' ? item.weight : 0, 0, 1),
      observed: typeof item.observed === 'string' ? item.observed.slice(0, 240) : ''
    }))
    .filter(item => item.observed.length > 0)
    .slice(0, 8)
}

const parseSimulation = (value: unknown): ReconciliationAiSimulation | null => {
  if (!isRecord(value)) return null

  const currentDifference = typeof value.currentDifference === 'number' ? value.currentDifference : null
  const projectedDifference = typeof value.projectedDifference === 'number' ? value.projectedDifference : null

  return {
    currentDifference,
    projectedDifference,
    affectedRows: asStringArray(value.affectedRows).slice(0, 20)
  }
}

export const parseSuggestionPayload = (
  value: unknown,
  fallbackSuggestionId: string
): ReconciliationAiSuggestionPayload | null => {
  if (!isRecord(value)) return null

  const suggestionType = typeof value.suggestionType === 'string' && VALID_TYPES.has(value.suggestionType as ReconciliationAiSuggestionType)
    ? value.suggestionType as ReconciliationAiSuggestionType
    : null

  if (!suggestionType) return null

  const confidence = clamp(typeof value.confidence === 'number' ? value.confidence : 0, 0, 1)
  const proposedAction = parseProposedAction(value.proposedAction)
  const evidenceFactors = parseEvidenceFactors(value.evidenceFactors)
  const rationale = typeof value.rationale === 'string' ? value.rationale.trim().slice(0, 1200) : ''

  if (!rationale) return null

  return {
    suggestionId: typeof value.suggestionId === 'string' && value.suggestionId.trim()
      ? value.suggestionId.trim()
      : fallbackSuggestionId,
    suggestionType,
    confidence,
    proposedAction,
    evidenceFactors,
    rationale,
    simulation: parseSimulation(value.simulation),
    requiresApproval: true
  }
}

export const parseSuggestionArray = (
  value: unknown,
  idFactory: () => string
): ReconciliationAiSuggestionPayload[] => {
  const rawSuggestions = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.suggestions)
      ? value.suggestions
      : []

  return rawSuggestions
    .map(raw => parseSuggestionPayload(raw, idFactory()))
    .filter((item): item is ReconciliationAiSuggestionPayload => Boolean(item))
    .slice(0, 12)
}
