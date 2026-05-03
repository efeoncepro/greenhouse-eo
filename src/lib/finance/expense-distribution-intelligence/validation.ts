import { isExpenseDistributionLane } from '@/lib/finance/expense-distribution/types'
import type { ExpenseDistributionSuggestionPayload } from './types'

const VALID_CONFIDENCE = new Set(['high', 'medium', 'low', 'manual_required'])
const VALID_CLOSE_IMPACT = new Set(['blocks_close', 'no_close_impact', 'review_before_close'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const asStringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim().slice(0, 120)).slice(0, 12)
  : []

const parseEvidence = (value: unknown): ExpenseDistributionSuggestionPayload['evidence'] => {
  const record = isRecord(value) ? value : {}

  const factors = Array.isArray(record.factors)
    ? record.factors
        .filter(isRecord)
        .map(item => ({
          factor: typeof item.factor === 'string' ? item.factor.slice(0, 80) : 'evidence',
          observed: typeof item.observed === 'string' ? item.observed.slice(0, 240) : '',
          weight: clamp(typeof item.weight === 'number' ? item.weight : 0, 0, 1)
        }))
        .filter(item => item.observed)
        .slice(0, 8)
    : []

  const closeImpact = typeof record.closeImpact === 'string' && VALID_CLOSE_IMPACT.has(record.closeImpact)
    ? record.closeImpact as ExpenseDistributionSuggestionPayload['evidence']['closeImpact']
    : 'review_before_close'

  return {
    factors,
    riskFlags: asStringArray(record.riskFlags),
    proposedRule: typeof record.proposedRule === 'string' && record.proposedRule.trim()
      ? record.proposedRule.trim().slice(0, 500)
      : null,
    closeImpact
  }
}

export const parseExpenseDistributionSuggestionPayload = (
  value: unknown,
  fallbackSuggestionId: string
): ExpenseDistributionSuggestionPayload | null => {
  if (!isRecord(value)) return null

  const expenseId = typeof value.expenseId === 'string' ? value.expenseId.trim() : ''

  const lane = isExpenseDistributionLane(value.suggestedDistributionLane)
    ? value.suggestedDistributionLane
    : null

  const confidence = typeof value.confidence === 'string' && VALID_CONFIDENCE.has(value.confidence)
    ? value.confidence as ExpenseDistributionSuggestionPayload['confidence']
    : 'manual_required'

  const rationale = typeof value.rationale === 'string' ? value.rationale.trim().slice(0, 1200) : ''

  if (!expenseId || !lane || !rationale) return null

  return {
    suggestionId: typeof value.suggestionId === 'string' && value.suggestionId.trim()
      ? value.suggestionId.trim()
      : fallbackSuggestionId,
    expenseId,
    suggestedDistributionLane: lane,
    suggestedMemberId: typeof value.suggestedMemberId === 'string' && value.suggestedMemberId.trim()
      ? value.suggestedMemberId.trim()
      : null,
    suggestedClientId: typeof value.suggestedClientId === 'string' && value.suggestedClientId.trim()
      ? value.suggestedClientId.trim()
      : null,
    confidence,
    rationale,
    evidence: parseEvidence(value.evidence),
    requiresHumanApproval: true
  }
}

export const parseExpenseDistributionSuggestionArray = (
  value: unknown,
  idFactory: () => string
): ExpenseDistributionSuggestionPayload[] => {
  const rawSuggestions = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.suggestions)
      ? value.suggestions
      : []

  return rawSuggestions
    .map(item => parseExpenseDistributionSuggestionPayload(item, idFactory()))
    .filter((item): item is ExpenseDistributionSuggestionPayload => Boolean(item))
    .slice(0, 12)
}
