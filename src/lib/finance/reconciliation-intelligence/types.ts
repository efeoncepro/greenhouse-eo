import type { ReconciliationCandidate } from '@/lib/finance/reconciliation'

export const RECONCILIATION_AI_PROMPT_VERSION = 'reconciliation_intelligence_v1'
export const RULES_ONLY_MODEL_ID = 'rules-only'

export type ReconciliationAiSuggestionType =
  | 'match'
  | 'group_match'
  | 'drift_explanation'
  | 'import_mapping'
  | 'closure_review'
  | 'anomaly'

export type ReconciliationAiSuggestionStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded'
  | 'failed'

export type ReconciliationAiAction =
  | 'open_match_dialog'
  | 'suggest_group'
  | 'explain_drift'
  | 'review_before_close'
  | 'normalize_import'
  | 'no_action'

export interface ReconciliationAiEvidenceFactor {
  factor: string
  weight: number
  observed: string
}

export interface ReconciliationAiProposedAction {
  action: ReconciliationAiAction
  targetIds: string[]
  payload: Record<string, unknown>
}

export interface ReconciliationAiSimulation {
  currentDifference: number | null
  projectedDifference: number | null
  affectedRows: string[]
}

export interface ReconciliationAiSuggestionPayload {
  suggestionId: string
  suggestionType: ReconciliationAiSuggestionType
  confidence: number
  proposedAction: ReconciliationAiProposedAction
  evidenceFactors: ReconciliationAiEvidenceFactor[]
  rationale: string
  simulation: ReconciliationAiSimulation | null
  requiresApproval: true
}

export interface ReconciliationIntelligencePeriodScope {
  periodId: string
  accountId: string
  spaceId: string
  year: number
  month: number
  status: string
  archivedAt: string | null
  statementImported: boolean
  statementRowCount: number
  difference: number | null
  accountName: string
  currency: string
}

export interface ReconciliationIntelligenceStatementRow {
  rowId: string
  periodId: string
  transactionDate: string
  description: string
  reference: string | null
  amount: number
  balance: number | null
  matchStatus: string
}

export interface ScopedReconciliationCandidate extends ReconciliationCandidate {
  scopeStatus: 'canonical_settlement_leg' | 'legacy_payment_only'
}

export interface PersistedReconciliationAiSuggestion extends ReconciliationAiSuggestionPayload {
  spaceId: string
  periodId: string
  accountId: string
  status: ReconciliationAiSuggestionStatus
  statementRowIds: string[]
  candidatePaymentIds: string[]
  candidateSettlementLegIds: string[]
  modelId: string
  promptVersion: string
  promptHash: string
  inputHash: string
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number | null
  generatedAt: string
  acceptedByUserId: string | null
  acceptedAt: string | null
  rejectedByUserId: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  failureReason: string | null
}

export type ReconciliationIntelligenceMode =
  | 'statement_rows'
  | 'drift'
  | 'closure_review'
  | 'import_mapping'

export interface GenerateReconciliationSuggestionsInput {
  periodId: string
  mode?: ReconciliationIntelligenceMode
  actorUserId: string | null
  forceRefresh?: boolean
}

export interface GenerateReconciliationSuggestionsResult {
  enabled: boolean
  skippedReason: string | null
  generated: number
  persisted: number
  suggestions: PersistedReconciliationAiSuggestion[]
}
