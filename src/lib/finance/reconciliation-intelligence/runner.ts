import 'server-only'

import { FinanceValidationError } from '@/lib/finance/shared'

import {
  buildInputHash,
  buildPromptContext,
  buildPromptHash,
  buildUserPrompt,
  SYSTEM_PROMPT
} from './build-prompt'
import { listScopedReconciliationCandidates } from './candidates'
import { isReconciliationAiEnabled } from './kill-switch'
import { generateLlmSuggestions } from './llm-provider'
import { buildRulesOnlySuggestions } from './prepass'
import {
  listReconciliationAiSuggestions,
  recordReconciliationAiSuggestion
} from './repository'
import {
  getReconciliationIntelligenceScope,
  listScopedUnmatchedStatementRows
} from './scope'
import {
  RECONCILIATION_AI_PROMPT_VERSION,
  RULES_ONLY_MODEL_ID,
  type GenerateReconciliationSuggestionsInput,
  type GenerateReconciliationSuggestionsResult,
  type ReconciliationAiSuggestionPayload
} from './types'

const extractStatementRowIds = (suggestion: ReconciliationAiSuggestionPayload) =>
  suggestion.proposedAction.payload.rowId && typeof suggestion.proposedAction.payload.rowId === 'string'
    ? [suggestion.proposedAction.payload.rowId]
    : suggestion.proposedAction.targetIds.filter(id => id.startsWith('bsr-') || id.startsWith('row-'))

const extractCandidatePaymentIds = (suggestion: ReconciliationAiSuggestionPayload) => {
  const fromPayload = suggestion.proposedAction.payload.matchedPaymentId

  return typeof fromPayload === 'string' && fromPayload ? [fromPayload] : []
}

const extractCandidateSettlementLegIds = (suggestion: ReconciliationAiSuggestionPayload) => {
  const fromPayload = suggestion.proposedAction.payload.matchedSettlementLegId

  return typeof fromPayload === 'string' && fromPayload ? [fromPayload] : []
}

export const generateReconciliationSuggestions = async ({
  periodId,
  mode = 'statement_rows',
  forceRefresh = false
}: GenerateReconciliationSuggestionsInput): Promise<GenerateReconciliationSuggestionsResult> => {
  const scope = await getReconciliationIntelligenceScope(periodId)

  if (scope.archivedAt) {
    return {
      enabled: false,
      skippedReason: 'El periodo está archivado; AI no genera sugerencias sobre periodos de prueba.',
      generated: 0,
      persisted: 0,
      suggestions: await listReconciliationAiSuggestions(scope)
    }
  }

  if (scope.status === 'closed') {
    return {
      enabled: false,
      skippedReason: 'El periodo está cerrado; AI queda en modo lectura.',
      generated: 0,
      persisted: 0,
      suggestions: await listReconciliationAiSuggestions(scope)
    }
  }

  if (!isReconciliationAiEnabled() && !forceRefresh) {
    return {
      enabled: false,
      skippedReason: 'FINANCE_RECONCILIATION_AI_ENABLED=false',
      generated: 0,
      persisted: 0,
      suggestions: await listReconciliationAiSuggestions(scope)
    }
  }

  if (mode !== 'statement_rows' && mode !== 'drift' && mode !== 'closure_review') {
    throw new FinanceValidationError('Modo de inteligencia no soportado en V1.', 400)
  }

  const rows = await listScopedUnmatchedStatementRows(scope)
  const candidates = await listScopedReconciliationCandidates(scope)

  if (rows.length === 0 && mode === 'statement_rows') {
    return {
      enabled: true,
      skippedReason: 'No hay filas pendientes para sugerir matches.',
      generated: 0,
      persisted: 0,
      suggestions: await listReconciliationAiSuggestions(scope)
    }
  }

  const context = buildPromptContext({ scope, rows, candidates })
  const inputHash = buildInputHash(context)
  const promptHash = buildPromptHash()
  const persisted = []

  const rulesOnly = buildRulesOnlySuggestions({ scope, rows, candidates })

  for (const suggestion of rulesOnly) {
    persisted.push(await recordReconciliationAiSuggestion({
      scope,
      payload: suggestion,
      status: 'proposed',
      statementRowIds: extractStatementRowIds(suggestion),
      candidatePaymentIds: extractCandidatePaymentIds(suggestion),
      candidateSettlementLegIds: extractCandidateSettlementLegIds(suggestion),
      modelId: RULES_ONLY_MODEL_ID,
      promptVersion: RECONCILIATION_AI_PROMPT_VERSION,
      promptHash,
      inputHash: `${inputHash}:rules:${suggestion.proposedAction.targetIds.join(':')}`,
      outputJson: { suggestion, engine: 'rules-only' },
      tokensIn: null,
      tokensOut: null,
      latencyMs: 0
    }))
  }

  const rowsCoveredByRules = new Set(rulesOnly.flatMap(extractStatementRowIds))
  const ambiguousRows = rows.filter(row => !rowsCoveredByRules.has(row.rowId))

  if (ambiguousRows.length > 0 && isReconciliationAiEnabled()) {
    try {
      const llmContext = buildPromptContext({ scope, rows: ambiguousRows, candidates })

      const llmResult = await generateLlmSuggestions({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(llmContext)
      })

      for (const suggestion of llmResult.suggestions) {
        persisted.push(await recordReconciliationAiSuggestion({
          scope,
          payload: suggestion,
          status: suggestion.confidence <= 0.2 ? 'draft' : 'proposed',
          statementRowIds: extractStatementRowIds(suggestion),
          candidatePaymentIds: extractCandidatePaymentIds(suggestion),
          candidateSettlementLegIds: extractCandidateSettlementLegIds(suggestion),
          modelId: llmResult.modelId,
          promptVersion: RECONCILIATION_AI_PROMPT_VERSION,
          promptHash,
          inputHash: `${buildInputHash(llmContext)}:llm:${suggestion.proposedAction.targetIds.join(':')}`,
          outputJson: llmResult.rawOutput,
          tokensIn: llmResult.tokensIn,
          tokensOut: llmResult.tokensOut,
          latencyMs: llmResult.latencyMs
        }))
      }
    } catch (error) {
      console.error('[reconciliation-intelligence] LLM suggestions failed', error)
    }
  }

  return {
    enabled: true,
    skippedReason: null,
    generated: persisted.length,
    persisted: persisted.length,
    suggestions: await listReconciliationAiSuggestions(scope)
  }
}

export const listCurrentReconciliationSuggestions = async (periodId: string) => {
  const scope = await getReconciliationIntelligenceScope(periodId)

  return listReconciliationAiSuggestions(scope)
}
