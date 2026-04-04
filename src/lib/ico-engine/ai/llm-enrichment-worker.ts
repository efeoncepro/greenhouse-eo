import 'server-only'

import { query } from '@/lib/db'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { generateAiSignalEnrichment } from './llm-provider'
import type { AiSignalRecord } from './types'
import {
  buildIcoLlmPromptHash,
  ICO_LLM_DEFAULT_MODEL_ID,
  ICO_LLM_PROMPT_VERSION,
  ICO_LLM_SUPPORTED_SIGNAL_TYPES,
  stableEnrichmentId,
  stableRunId,
  toSerializableSignalSnapshot,
  type AiEnrichmentRunRecord,
  type AiSignalEnrichmentRecord
} from './llm-types'

export interface MaterializeAiLlmEnrichmentsInput {
  periodYear: number
  periodMonth: number
  spaceId?: string | null
  triggerEventId?: string | null
  triggerType?: string
  modelId?: string | null
}

export interface MaterializeAiLlmEnrichmentsResult {
  run: AiEnrichmentRunRecord
  recordsWritten: number
  succeeded: number
  failed: number
  skipped: number
}

type BigQuerySignalRow = Record<string, unknown>

const SUPPORTED_SIGNAL_TYPES = new Set<string>(ICO_LLM_SUPPORTED_SIGNAL_TYPES)

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return null
}

const toText = (value: unknown) => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed || null
}

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    return normalized === 'true' || normalized === 't' || normalized === '1'
  }

  return false
}

const toJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  return {}
}

const mapSignalRow = (row: BigQuerySignalRow): AiSignalRecord | null => {
  const signalId = toText(row.signal_id)
  const signalType = toText(row.signal_type)
  const spaceId = toText(row.space_id)
  const metricName = toText(row.metric_name)
  const periodYear = toNumber(row.period_year)
  const periodMonth = toNumber(row.period_month)
  const modelVersion = toText(row.model_version)
  const generatedAt = toText(row.generated_at)

  if (
    !signalId ||
    !signalType ||
    !spaceId ||
    !metricName ||
    !Number.isInteger(periodYear) ||
    !Number.isInteger(periodMonth) ||
    !modelVersion ||
    !generatedAt
  ) {
    return null
  }

  return {
    signalId,
    signalType: signalType as AiSignalRecord['signalType'],
    spaceId,
    memberId: toText(row.member_id),
    projectId: toText(row.project_id),
    metricName: metricName as AiSignalRecord['metricName'],
    periodYear: periodYear as number,
    periodMonth: periodMonth as number,
    severity: (toText(row.severity) as AiSignalRecord['severity']) ?? null,
    currentValue: toNumber(row.current_value),
    expectedValue: toNumber(row.expected_value),
    zScore: toNumber(row.z_score),
    predictedValue: toNumber(row.predicted_value),
    confidence: toNumber(row.confidence),
    predictionHorizon: toText(row.prediction_horizon),
    contributionPct: toNumber(row.contribution_pct),
    dimension: (toText(row.dimension) as AiSignalRecord['dimension']) ?? null,
    dimensionId: toText(row.dimension_id),
    actionType: toText(row.action_type),
    actionSummary: toText(row.action_summary),
    actionTargetId: toText(row.action_target_id),
    modelVersion,
    generatedAt,
    aiEligible: toBoolean(row.ai_eligible),
    payloadJson: toJsonObject(row.payload_json)
  }
}

const chunk = <T>(items: T[], size: number) => {
  const groups: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }

  return groups
}

const buildBaseRecord = (signal: AiSignalRecord, runId: string, promptHash: string, modelId: string): Omit<AiSignalEnrichmentRecord, 'qualityScore' | 'explanationSummary' | 'rootCauseNarrative' | 'recommendedAction' | 'explanationJson' | 'confidence' | 'tokensIn' | 'tokensOut' | 'latencyMs' | 'status' | 'errorMessage' | 'processedAt'> => ({
  enrichmentId: stableEnrichmentId(signal.signalId, promptHash),
  runId,
  signalId: signal.signalId,
  spaceId: signal.spaceId,
  memberId: signal.memberId,
  projectId: signal.projectId,
  signalType: signal.signalType,
  metricName: signal.metricName,
  periodYear: signal.periodYear,
  periodMonth: signal.periodMonth,
  severity: signal.severity,
  modelId,
  promptVersion: ICO_LLM_PROMPT_VERSION,
  promptHash,
  inputSignalSnapshot: toSerializableSignalSnapshot(signal)
})

const toBigQueryEnrichmentRow = (record: AiSignalEnrichmentRecord) => ({
  enrichment_id: record.enrichmentId,
  run_id: record.runId,
  signal_id: record.signalId,
  space_id: record.spaceId,
  member_id: record.memberId,
  project_id: record.projectId,
  signal_type: record.signalType,
  metric_name: record.metricName,
  period_year: record.periodYear,
  period_month: record.periodMonth,
  severity: record.severity,
  quality_score: record.qualityScore,
  explanation_summary: record.explanationSummary,
  root_cause_narrative: record.rootCauseNarrative,
  recommended_action: record.recommendedAction,
  explanation_json: JSON.stringify(record.explanationJson),
  model_id: record.modelId,
  prompt_version: record.promptVersion,
  prompt_hash: record.promptHash,
  confidence: record.confidence,
  tokens_in: record.tokensIn,
  tokens_out: record.tokensOut,
  latency_ms: record.latencyMs,
  status: record.status,
  error_message: record.errorMessage,
  input_signal_snapshot: JSON.stringify(record.inputSignalSnapshot),
  processed_at: record.processedAt,
  _synced_at: record.processedAt
})

const toBigQueryRunRow = (run: AiEnrichmentRunRecord) => ({
  run_id: run.runId,
  trigger_event_id: run.triggerEventId,
  space_id: run.spaceId,
  period_year: run.periodYear,
  period_month: run.periodMonth,
  trigger_type: run.triggerType,
  status: run.status,
  signals_seen: run.signalsSeen,
  signals_enriched: run.signalsEnriched,
  signals_failed: run.signalsFailed,
  model_id: run.modelId,
  prompt_version: run.promptVersion,
  prompt_hash: run.promptHash,
  tokens_in: run.tokensIn,
  tokens_out: run.tokensOut,
  latency_ms: run.latencyMs,
  error_message: run.errorMessage,
  started_at: run.startedAt,
  completed_at: run.completedAt,
  _synced_at: run.completedAt ?? run.startedAt
})

const deleteBigQueryCurrentState = async (input: {
  projectId: string
  periodYear: number
  periodMonth: number
  spaceId?: string | null
}) => {
  const params = input.spaceId
    ? { periodYear: input.periodYear, periodMonth: input.periodMonth, spaceId: input.spaceId }
    : { periodYear: input.periodYear, periodMonth: input.periodMonth }

  const enrichmentDeleteQuery = input.spaceId
    ? `
      DELETE FROM \`${input.projectId}.${ICO_DATASET}.ai_signal_enrichments\`
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
        AND space_id = @spaceId
    `
    : `
      DELETE FROM \`${input.projectId}.${ICO_DATASET}.ai_signal_enrichments\`
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
    `

  const bigQuery = getBigQueryClient()

  await bigQuery.query({ query: enrichmentDeleteQuery, params })
}

const persistServingState = async (records: AiSignalEnrichmentRecord[], run: AiEnrichmentRunRecord) => {
  if (run.spaceId) {
    await query(
      `
        DELETE FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
          AND space_id = $3
      `,
      [run.periodYear, run.periodMonth, run.spaceId]
    )
  } else {
    await query(
      `
        DELETE FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
      `,
      [run.periodYear, run.periodMonth]
    )
  }

  for (const record of records) {
    await query(
      `
        INSERT INTO greenhouse_serving.ico_ai_signal_enrichments (
          enrichment_id,
          run_id,
          signal_id,
          space_id,
          member_id,
          project_id,
          signal_type,
          metric_name,
          period_year,
          period_month,
          severity,
          quality_score,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          explanation_json,
          model_id,
          prompt_version,
          prompt_hash,
          confidence,
          tokens_in,
          tokens_out,
          latency_ms,
          status,
          error_message,
          processed_at,
          synced_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, NOW()
        )
        ON CONFLICT (enrichment_id) DO UPDATE SET
          run_id = EXCLUDED.run_id,
          signal_id = EXCLUDED.signal_id,
          space_id = EXCLUDED.space_id,
          member_id = EXCLUDED.member_id,
          project_id = EXCLUDED.project_id,
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
        record.spaceId,
        record.memberId,
        record.projectId,
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
      INSERT INTO greenhouse_serving.ico_ai_enrichment_runs (
        run_id,
        trigger_event_id,
        space_id,
        period_year,
        period_month,
        trigger_type,
        status,
        signals_seen,
        signals_enriched,
        signals_failed,
        model_id,
        prompt_version,
        prompt_hash,
        tokens_in,
        tokens_out,
        latency_ms,
        error_message,
        started_at,
        completed_at,
        synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
      )
      ON CONFLICT (run_id) DO UPDATE SET
        trigger_event_id = EXCLUDED.trigger_event_id,
        space_id = EXCLUDED.space_id,
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
      run.spaceId,
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

const buildFailedRecord = (
  signal: AiSignalRecord,
  runId: string,
  promptHash: string,
  modelId: string,
  status: AiSignalEnrichmentRecord['status'],
  errorMessage: string
): AiSignalEnrichmentRecord => ({
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

export const materializeAiLlmEnrichments = async (
  input: MaterializeAiLlmEnrichmentsInput
): Promise<MaterializeAiLlmEnrichmentsResult> => {
  await ensureIcoEngineInfrastructure()

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()
  const modelId = input.modelId?.trim() || ICO_LLM_DEFAULT_MODEL_ID
  const promptHash = buildIcoLlmPromptHash()
  const runId = stableRunId(input.periodYear, input.periodMonth, promptHash)
  const startedAt = new Date().toISOString()

  const queryText = input.spaceId
    ? `
      SELECT *
      FROM \`${projectId}.${ICO_DATASET}.ai_signals\`
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
        AND space_id = @spaceId
      ORDER BY generated_at DESC, signal_id ASC
    `
    : `
      SELECT *
      FROM \`${projectId}.${ICO_DATASET}.ai_signals\`
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
      ORDER BY generated_at DESC, signal_id ASC
    `

  const params = input.spaceId
    ? { periodYear: input.periodYear, periodMonth: input.periodMonth, spaceId: input.spaceId }
    : { periodYear: input.periodYear, periodMonth: input.periodMonth }

  const [rawRows] = await bigQuery.query({ query: queryText, params })

  const signals = (rawRows as BigQuerySignalRow[])
    .map(mapSignalRow)
    .filter((row): row is AiSignalRecord => Boolean(row))

  const records: AiSignalEnrichmentRecord[] = []

  for (const signalBatch of chunk(signals, 4)) {
    const batchResults = await Promise.all(
      signalBatch.map(async signal => {
        if (!signal.aiEligible) {
          return buildFailedRecord(signal, runId, promptHash, modelId, 'skipped', 'Signal is not AI-eligible')
        }

        if (!SUPPORTED_SIGNAL_TYPES.has(signal.signalType)) {
          return buildFailedRecord(signal, runId, promptHash, modelId, 'skipped', `Unsupported signal type: ${signal.signalType}`)
        }

        try {
          const generated = await generateAiSignalEnrichment({
            signal,
            modelId,
            promptVersion: ICO_LLM_PROMPT_VERSION,
            promptHash
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
            status: 'succeeded' as const,
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

  const runStatus =
    failed > 0 && succeeded === 0
      ? 'failed'
      : failed > 0
        ? 'partial'
        : 'succeeded'

  const run: AiEnrichmentRunRecord = {
    runId,
    triggerEventId: input.triggerEventId ?? null,
    spaceId: input.spaceId ?? null,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    triggerType: input.triggerType ?? EVENT_TYPES.icoAiSignalsMaterialized,
    status: runStatus,
    signalsSeen: signals.length,
    signalsEnriched: succeeded,
    signalsFailed: failed,
    modelId,
    promptVersion: ICO_LLM_PROMPT_VERSION,
    promptHash,
    tokensIn: records.reduce((sum, record) => sum + (record.tokensIn ?? 0), 0),
    tokensOut: records.reduce((sum, record) => sum + (record.tokensOut ?? 0), 0),
    latencyMs: records.reduce((sum, record) => sum + (record.latencyMs ?? 0), 0),
    errorMessage: failed > 0 && succeeded === 0 ? 'All enrichments failed for this run' : null,
    startedAt,
    completedAt
  }

  await deleteBigQueryCurrentState({
    projectId,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    spaceId: input.spaceId
  })

  if (records.length > 0) {
    await bigQuery.dataset(ICO_DATASET).table('ai_signal_enrichments').insert(records.map(toBigQueryEnrichmentRow))
  }

  await bigQuery.dataset(ICO_DATASET).table('ai_enrichment_runs').insert([toBigQueryRunRow(run)])

  await persistServingState(records, run)

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.icoAiLlmEnrichments,
    aggregateId: input.spaceId
      ? `ico-ai-llm-${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}-${input.spaceId}`
      : `ico-ai-llm-${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}`,
    eventType: EVENT_TYPES.icoAiLlmEnrichmentsMaterialized,
    payload: {
      runId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      spaceId: input.spaceId ?? null,
      signalsSeen: run.signalsSeen,
      signalsEnriched: run.signalsEnriched,
      signalsFailed: run.signalsFailed,
      skipped,
      modelId,
      promptVersion: ICO_LLM_PROMPT_VERSION,
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
