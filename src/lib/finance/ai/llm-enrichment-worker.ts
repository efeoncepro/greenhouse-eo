import 'server-only'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import {
  buildFinanceLlmPromptHash,
  FINANCE_LLM_DEFAULT_MODEL_ID,
  FINANCE_LLM_PROMPT_VERSION,
  FINANCE_LLM_SUPPORTED_SIGNAL_TYPES,
  stableFinanceEnrichmentId,
  stableFinanceRunId,
  type FinanceEnrichmentRunRecord,
  type FinanceLlmSupportedSignalType,
  type FinanceSignalEnrichmentRecord,
  type FinanceSignalRecord,
  type FinanceSignalType
} from './finance-signal-types'
import { generateFinanceSignalEnrichment } from './llm-provider'
import { resolveFinanceSignalContext } from './resolve-finance-signal-context'

const SUPPORTED_SIGNAL_TYPES = new Set<string>(FINANCE_LLM_SUPPORTED_SIGNAL_TYPES)
const BATCH_SIZE = 4

// ─── Input/Output ───────────────────────────────────────────────────────────

export interface MaterializeFinanceAiLlmEnrichmentsInput {
  periodYear: number
  periodMonth: number
  organizationId?: string | null
  clientId?: string | null
  triggerEventId?: string | null
  triggerType?: string
  modelId?: string | null
}

export interface MaterializeFinanceAiLlmEnrichmentsResult {
  run: FinanceEnrichmentRunRecord
  recordsWritten: number
  succeeded: number
  failed: number
  skipped: number
}

// ─── Utilities ──────────────────────────────────────────────────────────────

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }

  return result
}

// ─── Load signals ──────────────────────────────────────────────────────────

type SignalRow = Record<string, unknown> & {
  signal_id: string
  signal_type: string
  organization_id: string | null
  client_id: string | null
  space_id: string | null
  metric_name: string
  period_year: number
  period_month: number
  severity: string | null
  current_value: string | number | null
  expected_value: string | number | null
  z_score: string | number | null
  predicted_value: string | number | null
  confidence: string | number | null
  prediction_horizon: string | null
  contribution_pct: string | number | null
  dimension: string | null
  dimension_id: string | null
  action_type: string | null
  action_summary: string | null
  action_target_id: string | null
  model_version: string
  generated_at: Date | string
  ai_eligible: boolean
  payload_json: unknown
}

const mapRowToSignal = (row: SignalRow): FinanceSignalRecord => ({
  signalId: row.signal_id,
  signalType: row.signal_type as FinanceSignalType,
  organizationId: row.organization_id,
  clientId: row.client_id,
  spaceId: row.space_id,
  metricName: row.metric_name as FinanceSignalRecord['metricName'],
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  severity: (row.severity ?? null) as FinanceSignalRecord['severity'],
  currentValue: toNullableNumber(row.current_value),
  expectedValue: toNullableNumber(row.expected_value),
  zScore: toNullableNumber(row.z_score),
  predictedValue: toNullableNumber(row.predicted_value),
  confidence: toNullableNumber(row.confidence),
  predictionHorizon: row.prediction_horizon,
  contributionPct: toNullableNumber(row.contribution_pct),
  dimension: row.dimension,
  dimensionId: row.dimension_id,
  actionType: row.action_type,
  actionSummary: row.action_summary,
  actionTargetId: row.action_target_id,
  modelVersion: row.model_version,
  generatedAt:
    row.generated_at instanceof Date ? row.generated_at.toISOString() : String(row.generated_at),
  aiEligible: Boolean(row.ai_eligible),
  payloadJson: toJsonObject(row.payload_json)
})

const loadSignals = async (
  periodYear: number,
  periodMonth: number,
  organizationId?: string | null,
  clientId?: string | null
): Promise<FinanceSignalRecord[]> => {
  const filters: string[] = ['period_year = $1', 'period_month = $2']
  const params: Array<unknown> = [periodYear, periodMonth]

  if (organizationId) {
    filters.push(`organization_id = $${params.length + 1}`)
    params.push(organizationId)
  }

  if (clientId) {
    filters.push(`client_id = $${params.length + 1}`)
    params.push(clientId)
  }

  const rows = await query<SignalRow>(
    `
      SELECT *
      FROM greenhouse_serving.finance_ai_signals
      WHERE ${filters.join(' AND ')}
      ORDER BY generated_at DESC, signal_id ASC
    `,
    params
  )

  return rows.map(mapRowToSignal)
}

// ─── Persistence ────────────────────────────────────────────────────────────

const persistServingState = async (
  records: FinanceSignalEnrichmentRecord[],
  run: FinanceEnrichmentRunRecord
): Promise<void> => {
  const scopeFilters: string[] = ['period_year = $1', 'period_month = $2']
  const scopeParams: Array<unknown> = [run.periodYear, run.periodMonth]

  if (run.organizationId) {
    scopeFilters.push(`organization_id = $${scopeParams.length + 1}`)
    scopeParams.push(run.organizationId)
  }

  if (run.clientId) {
    scopeFilters.push(`client_id = $${scopeParams.length + 1}`)
    scopeParams.push(run.clientId)
  }

  await query(
    `DELETE FROM greenhouse_serving.finance_ai_signal_enrichments WHERE ${scopeFilters.join(' AND ')}`,
    scopeParams
  )

  for (const record of records) {
    await query(
      `
        INSERT INTO greenhouse_serving.finance_ai_signal_enrichments (
          enrichment_id, run_id, signal_id, organization_id, client_id, space_id,
          signal_type, metric_name, period_year, period_month, severity,
          quality_score, explanation_summary, root_cause_narrative, recommended_action, explanation_json,
          model_id, prompt_version, prompt_hash, confidence,
          tokens_in, tokens_out, latency_ms, status, error_message, processed_at, synced_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16::jsonb,
          $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, NOW()
        )
        ON CONFLICT (enrichment_id) DO UPDATE SET
          run_id = EXCLUDED.run_id,
          signal_id = EXCLUDED.signal_id,
          organization_id = EXCLUDED.organization_id,
          client_id = EXCLUDED.client_id,
          space_id = EXCLUDED.space_id,
          signal_type = EXCLUDED.signal_type,
          metric_name = EXCLUDED.metric_name,
          period_year = EXCLUDED.period_year,
          period_month = EXCLUDED.period_month,
          severity = EXCLUDED.severity,
          quality_score = EXCLUDED.quality_score,
          explanation_summary = EXCLUDED.explanation_summary,
          root_cause_narrative = EXCLUDED.root_cause_narrative,
          recommended_action = EXCLUDED.recommended_action,
          explanation_json = EXCLUDED.explanation_json,
          model_id = EXCLUDED.model_id,
          prompt_version = EXCLUDED.prompt_version,
          prompt_hash = EXCLUDED.prompt_hash,
          confidence = EXCLUDED.confidence,
          tokens_in = EXCLUDED.tokens_in,
          tokens_out = EXCLUDED.tokens_out,
          latency_ms = EXCLUDED.latency_ms,
          status = EXCLUDED.status,
          error_message = EXCLUDED.error_message,
          processed_at = EXCLUDED.processed_at,
          synced_at = NOW()
      `,
      [
        record.enrichmentId,
        record.runId,
        record.signalId,
        record.organizationId,
        record.clientId,
        record.spaceId,
        record.signalType,
        record.metricName,
        record.periodYear,
        record.periodMonth,
        record.severity,
        record.qualityScore,
        record.explanationSummary,
        record.rootCauseNarrative,
        record.recommendedAction,
        JSON.stringify(record.explanationJson),
        record.modelId,
        record.promptVersion,
        record.promptHash,
        record.confidence,
        record.tokensIn,
        record.tokensOut,
        record.latencyMs,
        record.status,
        record.errorMessage,
        record.processedAt
      ]
    )
  }

  await query(
    `
      INSERT INTO greenhouse_serving.finance_ai_enrichment_runs (
        run_id, trigger_event_id, organization_id, client_id,
        period_year, period_month, trigger_type, status,
        signals_seen, signals_enriched, signals_failed,
        model_id, prompt_version, prompt_hash,
        tokens_in, tokens_out, latency_ms, error_message,
        started_at, completed_at, synced_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, NOW()
      )
      ON CONFLICT (run_id) DO UPDATE SET
        trigger_event_id = EXCLUDED.trigger_event_id,
        organization_id = EXCLUDED.organization_id,
        client_id = EXCLUDED.client_id,
        period_year = EXCLUDED.period_year,
        period_month = EXCLUDED.period_month,
        trigger_type = EXCLUDED.trigger_type,
        status = EXCLUDED.status,
        signals_seen = EXCLUDED.signals_seen,
        signals_enriched = EXCLUDED.signals_enriched,
        signals_failed = EXCLUDED.signals_failed,
        model_id = EXCLUDED.model_id,
        prompt_version = EXCLUDED.prompt_version,
        prompt_hash = EXCLUDED.prompt_hash,
        tokens_in = EXCLUDED.tokens_in,
        tokens_out = EXCLUDED.tokens_out,
        latency_ms = EXCLUDED.latency_ms,
        error_message = EXCLUDED.error_message,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        synced_at = NOW()
    `,
    [
      run.runId,
      run.triggerEventId,
      run.organizationId,
      run.clientId,
      run.periodYear,
      run.periodMonth,
      run.triggerType,
      run.status,
      run.signalsSeen,
      run.signalsEnriched,
      run.signalsFailed,
      run.modelId,
      run.promptVersion,
      run.promptHash,
      run.tokensIn,
      run.tokensOut,
      run.latencyMs,
      run.errorMessage,
      run.startedAt,
      run.completedAt
    ]
  )
}

// ─── Record builders ────────────────────────────────────────────────────────

const buildBaseRecord = (
  signal: FinanceSignalRecord,
  runId: string,
  promptHash: string,
  modelId: string
) => ({
  enrichmentId: stableFinanceEnrichmentId(signal.signalId, promptHash),
  runId,
  signalId: signal.signalId,
  organizationId: signal.organizationId,
  clientId: signal.clientId,
  spaceId: signal.spaceId,
  signalType: signal.signalType as FinanceLlmSupportedSignalType,
  metricName: signal.metricName,
  periodYear: signal.periodYear,
  periodMonth: signal.periodMonth,
  severity: signal.severity,
  modelId,
  promptVersion: FINANCE_LLM_PROMPT_VERSION,
  promptHash
})

const buildFailedRecord = (
  signal: FinanceSignalRecord,
  runId: string,
  promptHash: string,
  modelId: string,
  status: FinanceSignalEnrichmentRecord['status'],
  errorMessage: string
): FinanceSignalEnrichmentRecord => ({
  ...buildBaseRecord(signal, runId, promptHash, modelId),
  qualityScore: null,
  explanationSummary: null,
  rootCauseNarrative: null,
  recommendedAction: null,
  explanationJson: {},
  confidence: null,
  tokensIn: null,
  tokensOut: null,
  latencyMs: null,
  status,
  errorMessage,
  processedAt: new Date().toISOString()
})

// ─── Entry point ────────────────────────────────────────────────────────────

export const materializeFinanceAiLlmEnrichments = async (
  input: MaterializeFinanceAiLlmEnrichmentsInput
): Promise<MaterializeFinanceAiLlmEnrichmentsResult> => {
  const modelId = input.modelId?.trim() || FINANCE_LLM_DEFAULT_MODEL_ID
  const promptHash = buildFinanceLlmPromptHash()
  const runId = stableFinanceRunId(input.periodYear, input.periodMonth, promptHash)
  const startedAt = new Date().toISOString()

  const signals = await loadSignals(
    input.periodYear,
    input.periodMonth,
    input.organizationId ?? null,
    input.clientId ?? null
  )

  const resolvedContext = await resolveFinanceSignalContext(signals)

  const records: FinanceSignalEnrichmentRecord[] = []

  for (const signalBatch of chunk(signals, BATCH_SIZE)) {
    const batchResults = await Promise.all(
      signalBatch.map(async (signal): Promise<FinanceSignalEnrichmentRecord> => {
        if (!signal.aiEligible) {
          return buildFailedRecord(signal, runId, promptHash, modelId, 'skipped', 'Signal is not AI-eligible')
        }

        if (!SUPPORTED_SIGNAL_TYPES.has(signal.signalType)) {
          return buildFailedRecord(
            signal,
            runId,
            promptHash,
            modelId,
            'skipped',
            `Unsupported signal type: ${signal.signalType}`
          )
        }

        try {
          const generated = await generateFinanceSignalEnrichment({
            signal,
            modelId,
            promptVersion: FINANCE_LLM_PROMPT_VERSION,
            promptHash,
            resolvedContext
          })

          return {
            ...buildBaseRecord(signal, runId, promptHash, generated.modelId),
            qualityScore: generated.output.qualityScore,
            explanationSummary: generated.output.explanationSummary,
            rootCauseNarrative: generated.output.rootCauseNarrative,
            recommendedAction: generated.output.recommendedAction,
            explanationJson: generated.output,
            confidence: generated.output.confidence,
            tokensIn: generated.tokensIn,
            tokensOut: generated.tokensOut,
            latencyMs: generated.latencyMs,
            status: 'succeeded',
            errorMessage: null,
            processedAt: new Date().toISOString()
          }
        } catch (error) {
          return buildFailedRecord(
            signal,
            runId,
            promptHash,
            modelId,
            'failed',
            error instanceof Error ? error.message : 'Unknown LLM generation error'
          )
        }
      })
    )

    records.push(...batchResults)
  }

  const succeeded = records.filter(record => record.status === 'succeeded').length
  const failed = records.filter(record => record.status === 'failed').length
  const skipped = records.filter(record => record.status === 'skipped').length
  const completedAt = new Date().toISOString()

  const runStatus: FinanceEnrichmentRunRecord['status'] =
    failed > 0 && succeeded === 0 ? 'failed' : failed > 0 ? 'partial' : 'succeeded'

  const run: FinanceEnrichmentRunRecord = {
    runId,
    triggerEventId: input.triggerEventId ?? null,
    organizationId: input.organizationId ?? null,
    clientId: input.clientId ?? null,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    triggerType: input.triggerType ?? EVENT_TYPES.financeAiSignalsMaterialized,
    status: runStatus,
    signalsSeen: signals.length,
    signalsEnriched: succeeded,
    signalsFailed: failed,
    modelId,
    promptVersion: FINANCE_LLM_PROMPT_VERSION,
    promptHash,
    tokensIn: records.reduce((sum, record) => sum + (record.tokensIn ?? 0), 0),
    tokensOut: records.reduce((sum, record) => sum + (record.tokensOut ?? 0), 0),
    latencyMs: records.reduce((sum, record) => sum + (record.latencyMs ?? 0), 0),
    errorMessage: failed > 0 && succeeded === 0 ? 'All finance enrichments failed for this run' : null,
    startedAt,
    completedAt
  }

  await persistServingState(records, run)

  const aggregateSuffix = input.clientId
    ? `-client-${input.clientId}`
    : input.organizationId
      ? `-org-${input.organizationId}`
      : ''

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.financeAiLlmEnrichments,
    aggregateId: `finance-ai-llm-${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}${aggregateSuffix}`,
    eventType: EVENT_TYPES.financeAiLlmEnrichmentsMaterialized,
    payload: {
      runId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      organizationId: input.organizationId ?? null,
      clientId: input.clientId ?? null,
      signalsSeen: run.signalsSeen,
      signalsEnriched: run.signalsEnriched,
      signalsFailed: run.signalsFailed,
      skipped,
      modelId,
      promptVersion: FINANCE_LLM_PROMPT_VERSION,
      promptHash,
      status: run.status
    }
  }).catch(() => {})

  return {
    run,
    recordsWritten: records.length,
    succeeded,
    failed,
    skipped
  }
}
