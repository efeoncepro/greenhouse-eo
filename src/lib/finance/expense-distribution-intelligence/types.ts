import type { ResolverConfidence } from '@/lib/finance/economic-category/types'
import type { ExpenseDistributionLane } from '@/lib/finance/expense-distribution/types'

export const EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION = 'expense_distribution_intelligence_v1'
export const EXPENSE_DISTRIBUTION_RULES_ONLY_MODEL_ID = 'rules-only'

export interface ExpenseDistributionSuggestionPayload {
  suggestionId: string
  expenseId: string
  suggestedDistributionLane: ExpenseDistributionLane
  suggestedMemberId: string | null
  suggestedClientId: string | null
  confidence: ResolverConfidence
  rationale: string
  evidence: {
    factors: Array<{ factor: string; observed: string; weight: number }>
    riskFlags: string[]
    proposedRule: string | null
    closeImpact: 'blocks_close' | 'no_close_impact' | 'review_before_close'
  }
  requiresHumanApproval: true
}

export interface GenerateExpenseDistributionSuggestionsInput {
  year: number
  month: number
  actorUserId: string | null
  forceRefresh?: boolean
  limit?: number
}

export interface GenerateExpenseDistributionSuggestionsResult {
  enabled: boolean
  skippedReason: string | null
  generated: number
  persisted: number
  suggestions: unknown[]
}
