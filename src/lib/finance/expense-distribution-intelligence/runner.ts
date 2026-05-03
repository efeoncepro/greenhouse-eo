import 'server-only'

import { FinanceValidationError } from '@/lib/finance/shared'
import {
  getExpenseDistributionAiSuggestion,
  getExpenseForDistribution,
  listExpenseDistributionAiSuggestions,
  listExpenseDistributionReviewQueue,
  persistExpenseDistributionAiSuggestion,
  persistExpenseDistributionResolution,
  reviewExpenseDistributionAiSuggestion
} from '@/lib/finance/expense-distribution/repository'
import { resolveExpenseDistribution } from '@/lib/finance/expense-distribution/resolver'
import type {
  ExpenseDistributionAiSuggestion,
  ExpenseDistributionReviewQueueItem
} from '@/lib/finance/expense-distribution/repository'

import {
  buildInputHash,
  buildPromptContext,
  buildPromptHash,
  buildUserPrompt,
  SYSTEM_PROMPT
} from './build-prompt'
import { isExpenseDistributionAiEnabled } from './kill-switch'
import { generateLlmExpenseDistributionSuggestions } from './llm-provider'
import { buildRulesOnlySuggestions } from './prepass'
import {
  EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION,
  EXPENSE_DISTRIBUTION_RULES_ONLY_MODEL_ID,
  type GenerateExpenseDistributionSuggestionsInput,
  type GenerateExpenseDistributionSuggestionsResult,
  type ExpenseDistributionSuggestionPayload
} from './types'

const persistSuggestionPayload = async ({
  payload,
  modelId,
  promptHash,
  inputHash,
  evidence
}: {
  payload: ExpenseDistributionSuggestionPayload
  modelId: string
  promptHash: string
  inputHash: string
  evidence: Record<string, unknown>
}) =>
  persistExpenseDistributionAiSuggestion({
    suggestionId: payload.suggestionId,
    expenseId: payload.expenseId,
    periodYear: evidence.periodYear as number,
    periodMonth: evidence.periodMonth as number,
    suggestedDistributionLane: payload.suggestedDistributionLane,
    suggestedMemberId: payload.suggestedMemberId,
    suggestedClientId: payload.suggestedClientId,
    confidence: payload.confidence,
    rationale: payload.rationale,
    evidence: {
      ...payload.evidence,
      ...evidence,
      promptVersion: EXPENSE_DISTRIBUTION_AI_PROMPT_VERSION,
      requiresHumanApproval: true
    },
    inputHash,
    promptHash,
    modelId
  })

const queueMapByExpense = (items: ExpenseDistributionReviewQueueItem[]) =>
  new Map(items.map(item => [item.expense.expenseId, item]))

export const generateExpenseDistributionSuggestions = async ({
  year,
  month,
  forceRefresh = false,
  limit = 50
}: GenerateExpenseDistributionSuggestionsInput): Promise<GenerateExpenseDistributionSuggestionsResult> => {
  const period = { year, month }

  if (!isExpenseDistributionAiEnabled() && !forceRefresh) {
    return {
      enabled: false,
      skippedReason: 'FINANCE_DISTRIBUTION_AI_ENABLED=false',
      generated: 0,
      persisted: 0,
      suggestions: await listExpenseDistributionAiSuggestions({ period, limit })
    }
  }

  const queue = await listExpenseDistributionReviewQueue({ period, limit })

  if (queue.length === 0) {
    return {
      enabled: true,
      skippedReason: 'No hay resoluciones ambiguas para sugerir.',
      generated: 0,
      persisted: 0,
      suggestions: await listExpenseDistributionAiSuggestions({ period, limit })
    }
  }

  const context = buildPromptContext({ year, month, items: queue })
  const inputHash = buildInputHash(context)
  const promptHash = buildPromptHash()
  const byExpense = queueMapByExpense(queue)
  const persisted: ExpenseDistributionAiSuggestion[] = []

  const rulesOnly = buildRulesOnlySuggestions(queue)

  for (const suggestion of rulesOnly) {
    const queueItem = byExpense.get(suggestion.expenseId)

    persisted.push(await persistSuggestionPayload({
      payload: suggestion,
      modelId: EXPENSE_DISTRIBUTION_RULES_ONLY_MODEL_ID,
      promptHash,
      inputHash: `${inputHash}:rules:${suggestion.expenseId}:${suggestion.suggestedDistributionLane}`,
      evidence: {
        periodYear: year,
        periodMonth: month,
        currentResolutionId: queueItem?.resolutionId ?? null,
        engine: 'rules-only'
      }
    }))
  }

  const coveredByRules = new Set(rulesOnly.map(item => item.expenseId))
  const ambiguousForLlm = queue.filter(item => !coveredByRules.has(item.expense.expenseId))

  if (ambiguousForLlm.length > 0 && isExpenseDistributionAiEnabled()) {
    try {
      const llmContext = buildPromptContext({ year, month, items: ambiguousForLlm })

      const llmResult = await generateLlmExpenseDistributionSuggestions({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(llmContext)
      })

      for (const suggestion of llmResult.suggestions) {
        const queueItem = byExpense.get(suggestion.expenseId)

        if (!queueItem) continue

        persisted.push(await persistSuggestionPayload({
          payload: suggestion,
          modelId: llmResult.modelId,
          promptHash,
          inputHash: `${buildInputHash(llmContext)}:llm:${suggestion.expenseId}:${suggestion.suggestedDistributionLane}`,
          evidence: {
            periodYear: year,
            periodMonth: month,
            currentResolutionId: queueItem.resolutionId,
            engine: 'llm',
            tokensIn: llmResult.tokensIn,
            tokensOut: llmResult.tokensOut,
            latencyMs: llmResult.latencyMs
          }
        }))
      }
    } catch (error) {
      console.error('[expense-distribution-intelligence] LLM suggestions failed', error)
    }
  }

  return {
    enabled: true,
    skippedReason: null,
    generated: persisted.length,
    persisted: persisted.length,
    suggestions: await listExpenseDistributionAiSuggestions({ period, limit })
  }
}

export const listCurrentExpenseDistributionSuggestions = async ({
  year,
  month,
  limit = 50
}: {
  year: number
  month: number
  limit?: number
}) =>
  listExpenseDistributionAiSuggestions({ period: { year, month }, limit })

export const reviewAndMaybeApplyExpenseDistributionSuggestion = async ({
  suggestionId,
  decision,
  actorUserId
}: {
  suggestionId: string
  decision: 'approved' | 'rejected'
  actorUserId: string
}) => {
  const suggestion = await getExpenseDistributionAiSuggestion(suggestionId)

  if (!suggestion || suggestion.status !== 'pending_review') {
    throw new FinanceValidationError('Sugerencia no encontrada o ya revisada.', 404)
  }

  if (decision === 'rejected') {
    return {
      suggestion: await reviewExpenseDistributionAiSuggestion({ suggestionId, decision, actorUserId }),
      appliedResolution: null
    }
  }

  const expense = await getExpenseForDistribution(suggestion.expenseId)

  if (!expense) {
    throw new FinanceValidationError('Expense asociado no existe o fue anulado.', 404)
  }

  const baseDraft = resolveExpenseDistribution(expense)
  const memberId = suggestion.suggestedMemberId ?? baseDraft.memberId
  const clientId = suggestion.suggestedClientId ?? baseDraft.clientId

  if (
    (suggestion.suggestedDistributionLane === 'member_direct_labor' ||
      suggestion.suggestedDistributionLane === 'member_direct_tool') &&
    !memberId
  ) {
    throw new FinanceValidationError('La sugerencia aprobada requiere member_id para una lane member-direct.', 400)
  }

  if (suggestion.suggestedDistributionLane === 'client_direct_non_labor' && !clientId) {
    throw new FinanceValidationError('La sugerencia aprobada requiere client_id para una lane client-direct.', 400)
  }

  const applied = await persistExpenseDistributionResolution({
    ...baseDraft,
    distributionLane: suggestion.suggestedDistributionLane,
    resolutionStatus: suggestion.suggestedDistributionLane === 'unallocated' ? 'manual_required' : 'resolved',
    confidence: suggestion.confidence as typeof baseDraft.confidence,
    source: 'ai_approved',
    memberId,
    clientId,
    evidence: {
      ...baseDraft.evidence,
      ai_suggestion_id: suggestion.suggestionId,
      ai_model_id: suggestion.modelId,
      ai_prompt_hash: suggestion.promptHash,
      ai_input_hash: suggestion.inputHash,
      ai_rationale: suggestion.rationale,
      ai_evidence: suggestion.evidence
    },
    riskFlags: [...new Set([...baseDraft.riskFlags, 'ai_approved_human_reviewed'])]
  })

  return {
    suggestion: await reviewExpenseDistributionAiSuggestion({
      suggestionId,
      decision,
      actorUserId,
      appliedResolutionId: applied.resolutionId
    }),
    appliedResolution: applied
  }
}
