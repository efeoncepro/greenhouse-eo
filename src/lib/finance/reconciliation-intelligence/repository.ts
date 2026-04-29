import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { FinanceValidationError, normalizeString, toNumber } from '@/lib/finance/shared'

import type {
  PersistedReconciliationAiSuggestion,
  ReconciliationAiSuggestionPayload,
  ReconciliationAiSuggestionStatus,
  ReconciliationIntelligencePeriodScope
} from './types'

export interface RecordSuggestionInput {
  scope: ReconciliationIntelligencePeriodScope
  payload: ReconciliationAiSuggestionPayload
  status: ReconciliationAiSuggestionStatus
  statementRowIds: string[]
  candidatePaymentIds: string[]
  candidateSettlementLegIds: string[]
  modelId: string
  promptVersion: string
  promptHash: string
  inputHash: string
  outputJson: Record<string, unknown>
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number | null
  failureReason?: string | null
}

type SuggestionRow = {
  suggestion_id: string
  space_id: string
  period_id: string
  account_id: string
  suggestion_type: string
  status: ReconciliationAiSuggestionStatus
  confidence: string | number
  statement_row_ids: string[]
  candidate_payment_ids: string[]
  candidate_settlement_leg_ids: string[]
  proposed_action_json: unknown
  evidence_factors_json: unknown
  rationale: string
  simulation_json: unknown | null
  model_id: string
  prompt_version: string
  prompt_hash: string
  input_hash: string
  output_json: unknown
  tokens_in: number | null
  tokens_out: number | null
  latency_ms: number | null
  generated_at: string
  accepted_by_user_id: string | null
  accepted_at: string | null
  rejected_by_user_id: string | null
  rejected_at: string | null
  rejection_reason: string | null
  failure_reason: string | null
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const mapSuggestionRow = (row: SuggestionRow): PersistedReconciliationAiSuggestion => ({
  suggestionId: normalizeString(row.suggestion_id),
  spaceId: normalizeString(row.space_id),
  periodId: normalizeString(row.period_id),
  accountId: normalizeString(row.account_id),
  suggestionType: row.suggestion_type as PersistedReconciliationAiSuggestion['suggestionType'],
  status: row.status,
  confidence: toNumber(row.confidence),
  statementRowIds: row.statement_row_ids ?? [],
  candidatePaymentIds: row.candidate_payment_ids ?? [],
  candidateSettlementLegIds: row.candidate_settlement_leg_ids ?? [],
  proposedAction: asRecord(row.proposed_action_json) as unknown as PersistedReconciliationAiSuggestion['proposedAction'],
  evidenceFactors: Array.isArray(row.evidence_factors_json)
    ? row.evidence_factors_json as unknown as PersistedReconciliationAiSuggestion['evidenceFactors']
    : [],
  rationale: normalizeString(row.rationale),
  simulation: row.simulation_json ? asRecord(row.simulation_json) as unknown as PersistedReconciliationAiSuggestion['simulation'] : null,
  requiresApproval: true,
  modelId: normalizeString(row.model_id),
  promptVersion: normalizeString(row.prompt_version),
  promptHash: normalizeString(row.prompt_hash),
  inputHash: normalizeString(row.input_hash),
  tokensIn: row.tokens_in,
  tokensOut: row.tokens_out,
  latencyMs: row.latency_ms,
  generatedAt: normalizeString(row.generated_at),
  acceptedByUserId: row.accepted_by_user_id ? normalizeString(row.accepted_by_user_id) : null,
  acceptedAt: row.accepted_at ? normalizeString(row.accepted_at) : null,
  rejectedByUserId: row.rejected_by_user_id ? normalizeString(row.rejected_by_user_id) : null,
  rejectedAt: row.rejected_at ? normalizeString(row.rejected_at) : null,
  rejectionReason: row.rejection_reason ? normalizeString(row.rejection_reason) : null,
  failureReason: row.failure_reason ? normalizeString(row.failure_reason) : null
})

export const listReconciliationAiSuggestions = async (
  scope: ReconciliationIntelligencePeriodScope
): Promise<PersistedReconciliationAiSuggestion[]> => {
  const db = await getDb()

  const result = await sql<SuggestionRow>`
    SELECT
      suggestion_id, space_id, period_id, account_id, suggestion_type, status, confidence::text,
      statement_row_ids, candidate_payment_ids, candidate_settlement_leg_ids,
      proposed_action_json, evidence_factors_json, rationale, simulation_json,
      model_id, prompt_version, prompt_hash, input_hash, output_json,
      tokens_in, tokens_out, latency_ms, generated_at::text,
      accepted_by_user_id, accepted_at::text, rejected_by_user_id, rejected_at::text,
      rejection_reason, failure_reason
    FROM greenhouse_finance.reconciliation_ai_suggestions
    WHERE space_id = ${scope.spaceId}
      AND period_id = ${scope.periodId}
      AND account_id = ${scope.accountId}
    ORDER BY
      CASE status
        WHEN 'proposed' THEN 0
        WHEN 'accepted' THEN 1
        WHEN 'rejected' THEN 2
        ELSE 3
      END,
      confidence DESC,
      generated_at DESC
  `.execute(db)

  return result.rows.map(mapSuggestionRow)
}

export const recordReconciliationAiSuggestion = async (
  input: RecordSuggestionInput
): Promise<PersistedReconciliationAiSuggestion> => {
  const db = await getDb()

  const result = await sql<SuggestionRow>`
    INSERT INTO greenhouse_finance.reconciliation_ai_suggestions (
      suggestion_id, space_id, period_id, account_id, suggestion_type, status, confidence,
      statement_row_ids, candidate_payment_ids, candidate_settlement_leg_ids,
      proposed_action_json, evidence_factors_json, rationale, simulation_json,
      model_id, prompt_version, prompt_hash, input_hash, output_json,
      tokens_in, tokens_out, latency_ms, failure_reason
    )
    VALUES (
      ${input.payload.suggestionId},
      ${input.scope.spaceId},
      ${input.scope.periodId},
      ${input.scope.accountId},
      ${input.payload.suggestionType},
      ${input.status},
      ${input.payload.confidence},
      ${input.statementRowIds},
      ${input.candidatePaymentIds},
      ${input.candidateSettlementLegIds},
      ${JSON.stringify(input.payload.proposedAction)}::jsonb,
      ${JSON.stringify(input.payload.evidenceFactors)}::jsonb,
      ${input.payload.rationale},
      ${input.payload.simulation ? JSON.stringify(input.payload.simulation) : null}::jsonb,
      ${input.modelId},
      ${input.promptVersion},
      ${input.promptHash},
      ${input.inputHash},
      ${JSON.stringify(input.outputJson)}::jsonb,
      ${input.tokensIn},
      ${input.tokensOut},
      ${input.latencyMs},
      ${input.failureReason ?? null}
    )
    ON CONFLICT (period_id, prompt_version, input_hash, suggestion_type)
      WHERE status IN ('draft', 'proposed', 'accepted')
    DO UPDATE SET
      confidence = EXCLUDED.confidence,
      statement_row_ids = EXCLUDED.statement_row_ids,
      candidate_payment_ids = EXCLUDED.candidate_payment_ids,
      candidate_settlement_leg_ids = EXCLUDED.candidate_settlement_leg_ids,
      proposed_action_json = EXCLUDED.proposed_action_json,
      evidence_factors_json = EXCLUDED.evidence_factors_json,
      rationale = EXCLUDED.rationale,
      simulation_json = EXCLUDED.simulation_json,
      model_id = EXCLUDED.model_id,
      prompt_hash = EXCLUDED.prompt_hash,
      output_json = EXCLUDED.output_json,
      tokens_in = EXCLUDED.tokens_in,
      tokens_out = EXCLUDED.tokens_out,
      latency_ms = EXCLUDED.latency_ms,
      generated_at = NOW(),
      failure_reason = EXCLUDED.failure_reason
    RETURNING
      suggestion_id, space_id, period_id, account_id, suggestion_type, status, confidence::text,
      statement_row_ids, candidate_payment_ids, candidate_settlement_leg_ids,
      proposed_action_json, evidence_factors_json, rationale, simulation_json,
      model_id, prompt_version, prompt_hash, input_hash, output_json,
      tokens_in, tokens_out, latency_ms, generated_at::text,
      accepted_by_user_id, accepted_at::text, rejected_by_user_id, rejected_at::text,
      rejection_reason, failure_reason
  `.execute(db)

  return mapSuggestionRow(result.rows[0])
}

export const reviewReconciliationAiSuggestion = async ({
  scope,
  suggestionId,
  decision,
  actorUserId,
  rejectionReason
}: {
  scope: ReconciliationIntelligencePeriodScope
  suggestionId: string
  decision: 'accepted' | 'rejected'
  actorUserId: string
  rejectionReason?: string | null
}): Promise<PersistedReconciliationAiSuggestion> => {
  const db = await getDb()

  const result = await sql<SuggestionRow>`
    UPDATE greenhouse_finance.reconciliation_ai_suggestions
    SET
      status = ${decision},
      accepted_by_user_id = CASE WHEN ${decision} = 'accepted' THEN ${actorUserId} ELSE accepted_by_user_id END,
      accepted_at = CASE WHEN ${decision} = 'accepted' THEN NOW() ELSE accepted_at END,
      rejected_by_user_id = CASE WHEN ${decision} = 'rejected' THEN ${actorUserId} ELSE rejected_by_user_id END,
      rejected_at = CASE WHEN ${decision} = 'rejected' THEN NOW() ELSE rejected_at END,
      rejection_reason = CASE WHEN ${decision} = 'rejected' THEN ${rejectionReason ?? null} ELSE rejection_reason END
    WHERE suggestion_id = ${suggestionId}
      AND space_id = ${scope.spaceId}
      AND period_id = ${scope.periodId}
      AND account_id = ${scope.accountId}
      AND status IN ('proposed', 'draft')
    RETURNING
      suggestion_id, space_id, period_id, account_id, suggestion_type, status, confidence::text,
      statement_row_ids, candidate_payment_ids, candidate_settlement_leg_ids,
      proposed_action_json, evidence_factors_json, rationale, simulation_json,
      model_id, prompt_version, prompt_hash, input_hash, output_json,
      tokens_in, tokens_out, latency_ms, generated_at::text,
      accepted_by_user_id, accepted_at::text, rejected_by_user_id, rejected_at::text,
      rejection_reason, failure_reason
  `.execute(db)

  if (!result.rows[0]) {
    throw new FinanceValidationError('Sugerencia no encontrada o ya revisada.', 404)
  }

  return mapSuggestionRow(result.rows[0])
}
