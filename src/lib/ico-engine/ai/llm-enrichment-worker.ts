import 'server-only'

import { query } from '@/lib/db'
import { getBigQueryClient, getBigQueryProjectId, toBigQueryStructTimestamp } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { generateAiSignalEnrichment } from './llm-provider'
import { resolveSignalContext } from './resolve-signal-context'
import type { AiSignalRecord } from './types'
import { getResolvedProjectDisplay } from './entity-display-resolution'
import {
  buildIcoLlmPromptHash,
  ICO_LLM_DEFAULT_MODEL_ID,
  ICO_LLM_PROMPT_VERSION,
  ICO_LLM_SUPPORTED_SIGNAL_TYPES,
  stableEnrichmentId,
  stableEnrichmentHistoryId,
  stableReplayRunId,
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
  asOfTime?: string | null
  historyOnly?: boolean
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
const LLM_ENRICHMENT_TIMEOUT_MS = 60_000

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

const toText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toText((value as { value?: unknown }).value)
  }

  return null
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

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`LLM enrichment timed out after ${timeoutMs}ms (${label})`))
        }, timeoutMs)
      })
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
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
  processed_at: toBigQueryStructTimestamp(record.processedAt),
  _synced_at: toBigQueryStructTimestamp(record.processedAt)
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
  started_at: toBigQueryStructTimestamp(run.startedAt),
  completed_at: toBigQueryStructTimestamp(run.completedAt),
  _synced_at: toBigQueryStructTimestamp(run.completedAt ?? run.startedAt)
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

const persistServingState = async (
  records: AiSignalEnrichmentRecord[],
  run: AiEnrichmentRunRecord,
  options?: { historyOnly?: boolean; signalsUnmappable?: boolean }
) => {
  for (const record of records) {
    await query(
      `
        INSERT INTO greenhouse_serving.ico_ai_signal_enrichment_history (
          history_id,
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
          $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, NOW()
        )
        ON CONFLICT (history_id) DO UPDATE SET
          enrichment_id = EXCLUDED.enrichment_id,
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
        stableEnrichmentHistoryId(record.runId, record.enrichmentId),
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

  if (options?.historyOnly) {
    return
  }

  // TASK-941 Slice 4 — non-destructive serving guard: si signalsUnmappable
  // (contrato inválido, 0 records por bug timestamp), NO borrar el período del
  // serving — preserva el último estado bueno. El run row sí se escribe abajo
  // (status='failed'). Cuando el contrato es válido, replace-current-period
  // normal (records puede ser 0 legítimamente si el período no tiene señales).
  if (!options?.signalsUnmappable) {
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
  errorMessage: string,
  processedAt: string
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
  processedAt
})

export const materializeAiLlmEnrichments = async (
  input: MaterializeAiLlmEnrichmentsInput
): Promise<MaterializeAiLlmEnrichmentsResult> => {
  await ensureIcoEngineInfrastructure()

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()
  const modelId = input.modelId?.trim() || ICO_LLM_DEFAULT_MODEL_ID
  const promptHash = buildIcoLlmPromptHash()
  const asOfTime = input.asOfTime?.trim() || null
  const historyOnly = input.historyOnly === true

  const runId =
    historyOnly && asOfTime
      ? stableReplayRunId(input.periodYear, input.periodMonth, promptHash, asOfTime, input.spaceId)
      : stableRunId(input.periodYear, input.periodMonth, promptHash)

  const startedAt = new Date().toISOString()
  const recordProcessedAt = asOfTime ?? startedAt
  const systemTimeClause = asOfTime ? ' FOR SYSTEM_TIME AS OF TIMESTAMP(@asOfTime)' : ''

  // TASK-943 Slice 2: source canonical depende del path:
  // - asOfTime present (historyOnly replay) → leer raw `ai_signals` con
  //   FOR SYSTEM_TIME AS OF. BQ time travel funciona sobre TABLES, NO sobre
  //   VIEWS — la VIEW se re-evalúa cada vez sin historia propia.
  // - default path → leer VIEW `ai_signals_current` (latest-per-signal_id).
  //   Post-Slice 3 INSERT-only la raw acumula N generations intra-período;
  //   el enrichment debe operar sobre la latest, no sobre históricas.
  const sourceTable = asOfTime ? 'ai_signals' : 'ai_signals_current'

  const queryText = input.spaceId
    ? `
      SELECT *
      FROM \`${projectId}.${ICO_DATASET}.${sourceTable}\`${systemTimeClause}
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
        AND space_id = @spaceId
      ORDER BY generated_at DESC, signal_id ASC
    `
    : `
      SELECT *
      FROM \`${projectId}.${ICO_DATASET}.${sourceTable}\`${systemTimeClause}
      WHERE period_year = @periodYear
        AND period_month = @periodMonth
      ORDER BY generated_at DESC, signal_id ASC
    `

  const params = input.spaceId
    ? { periodYear: input.periodYear, periodMonth: input.periodMonth, spaceId: input.spaceId, ...(asOfTime ? { asOfTime } : {}) }
    : { periodYear: input.periodYear, periodMonth: input.periodMonth, ...(asOfTime ? { asOfTime } : {}) }

  const [rawRows] = await bigQuery.query({ query: queryText, params })

  const signals = (rawRows as BigQuerySignalRow[])
    .map(mapSignalRow)
    .filter((row): row is AiSignalRecord => Boolean(row))

  // TASK-941/ISSUE-082 anti-false-healthy invariant: si hay raw signals en BQ
  // pero 0 quedan mapeables, es un contrato inválido (típicamente generated_at
  // NULL). El run NO puede quedar 'succeeded'. Distinto de rawCount===0 (período
  // sin señales = benigno, no falla).
  const rawSignalRowCount = Array.isArray(rawRows) ? rawRows.length : 0
  const signalsUnmappable = rawSignalRowCount > 0 && signals.length === 0

  if (signalsUnmappable) {
    captureWithDomain(
      new Error(
        `ICO AI enrichment contract violation: ${rawSignalRowCount} raw signals present but 0 mappable for ${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}`
      ),
      'delivery',
      {
        tags: { source: 'ico_ai_enrichment', stage: 'map_signals' },
        extra: {
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          spaceId: input.spaceId ?? null,
          rawSignalRowCount
        }
      }
    )
  }

  const resolvedContext = await resolveSignalContext(signals)

  const records: AiSignalEnrichmentRecord[] = []

  for (const signalBatch of chunk(signals, 4)) {
    const batchResults = await Promise.all(
      signalBatch.map(async signal => {
        if (!signal.aiEligible) {
          return buildFailedRecord(signal, runId, promptHash, modelId, 'skipped', 'Signal is not AI-eligible', recordProcessedAt)
        }

        if (!SUPPORTED_SIGNAL_TYPES.has(signal.signalType)) {
          return buildFailedRecord(
            signal,
            runId,
            promptHash,
            modelId,
            'skipped',
            `Unsupported signal type: ${signal.signalType}`,
            recordProcessedAt
          )
        }

        try {
          const resolvedProject = signal.projectId
            ? getResolvedProjectDisplay(resolvedContext.projectResolutions, signal.spaceId, signal.projectId)
            : null

          const generated = await withTimeout(
            generateAiSignalEnrichment({
              signal,
              modelId,
              promptVersion: ICO_LLM_PROMPT_VERSION,
              promptHash,
              resolvedContext
            }),
            LLM_ENRICHMENT_TIMEOUT_MS,
            signal.signalId
          )

          return {
            ...buildBaseRecord(signal, runId, promptHash, generated.modelId),
            qualityScore: generated.output.qualityScore,
            explanationSummary: generated.output.explanationSummary,
            rootCauseNarrative: generated.output.rootCauseNarrative,
            recommendedAction: generated.output.recommendedAction,
            explanationJson: {
              ...generated.output,
              meta: {
                projectResolution: resolvedProject
                  ? {
                      displayLabel: resolvedProject.displayLabel,
                      matchedBy: resolvedProject.matchedBy,
                      canonicalProjectId: resolvedProject.canonicalProjectId,
                      sourceProjectId: resolvedProject.sourceProjectId,
                      spaceId: resolvedProject.spaceId
                    }
                  : null
              }
            },
            confidence: generated.output.confidence,
            tokensIn: generated.tokensIn,
            tokensOut: generated.tokensOut,
            latencyMs: generated.latencyMs,
            status: 'succeeded' as const,
            errorMessage: null,
            processedAt: recordProcessedAt
          }
        } catch (error) {
          return buildFailedRecord(
            signal,
            runId,
            promptHash,
            modelId,
            'failed',
            error instanceof Error ? error.message : 'Unknown LLM generation error',
            recordProcessedAt
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
    signalsUnmappable
      ? 'failed'
      : failed > 0 && succeeded === 0
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
    errorMessage: signalsUnmappable
      ? `${rawSignalRowCount} raw AI signals present but 0 mappable (invalid contract — likely null generated_at, ISSUE-082)`
      : failed > 0 && succeeded === 0
        ? 'All enrichments failed for this run'
        : null,
    startedAt,
    completedAt
  }

  // BigQuery write: best-effort. If streaming buffer blocks DELETE, continue with PostgreSQL serving.
  // TASK-941 Slice 4 — non-destructive guard: si signalsUnmappable (contrato
  // inválido) NO tocar BQ enrichments (el delete borraría el último estado bueno
  // sin reemplazo válido). Preserva BQ enrichments; el run row se escribe en PG.
  if (!historyOnly && !signalsUnmappable) {
    try {
      await deleteBigQueryCurrentState({
        projectId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        spaceId: input.spaceId
      })

      // TASK-900 follow-up — canonical fix: replace BQ streaming insert API
      // (.dataset().table().insert()) with DML INSERT INTO ... SELECT FROM UNNEST(@rows).
      // Streaming insert writes to streaming buffer where subsequent DML is
      // blocked ~30 min. DML INSERT writes directly to durable storage.
      // Eliminates the "streaming buffer blocks DELETE" failure mode.
      if (records.length > 0) {
        const enrichmentRows = records.map(toBigQueryEnrichmentRow)

        await bigQuery.query({
          query: `INSERT INTO \`${projectId}.${ICO_DATASET}.ai_signal_enrichments\` (
                    enrichment_id, run_id, signal_id, space_id, member_id, project_id,
                    signal_type, metric_name, period_year, period_month, severity,
                    quality_score, explanation_summary, root_cause_narrative,
                    recommended_action, explanation_json, model_id, prompt_version,
                    prompt_hash, confidence, tokens_in, tokens_out, latency_ms,
                    status, error_message, input_signal_snapshot, processed_at, _synced_at
                  )
                  SELECT
                    s.enrichment_id, s.run_id, s.signal_id, s.space_id, s.member_id, s.project_id,
                    s.signal_type, s.metric_name, s.period_year, s.period_month, s.severity,
                    s.quality_score, s.explanation_summary, s.root_cause_narrative,
                    s.recommended_action, s.explanation_json, s.model_id, s.prompt_version,
                    s.prompt_hash, s.confidence, s.tokens_in, s.tokens_out, s.latency_ms,
                    s.status, s.error_message, s.input_signal_snapshot, TIMESTAMP(s.processed_at), TIMESTAMP(s._synced_at)
                  FROM UNNEST(@rows) AS s`,
          params: { rows: enrichmentRows },
          types: {
            rows: [{
              enrichment_id: 'STRING',
              run_id: 'STRING',
              signal_id: 'STRING',
              space_id: 'STRING',
              member_id: 'STRING',
              project_id: 'STRING',
              signal_type: 'STRING',
              metric_name: 'STRING',
              period_year: 'INT64',
              period_month: 'INT64',
              severity: 'STRING',
              quality_score: 'FLOAT64',
              explanation_summary: 'STRING',
              root_cause_narrative: 'STRING',
              recommended_action: 'STRING',
              explanation_json: 'STRING',
              model_id: 'STRING',
              prompt_version: 'STRING',
              prompt_hash: 'STRING',
              confidence: 'FLOAT64',
              tokens_in: 'INT64',
              tokens_out: 'INT64',
              latency_ms: 'INT64',
              status: 'STRING',
              error_message: 'STRING',
              input_signal_snapshot: 'STRING',
              // TASK-941/ISSUE-082: STRING + TIMESTAMP() cast en SELECT (no 'TIMESTAMP' en struct → NULL)
              processed_at: 'STRING',
              _synced_at: 'STRING'
            }]
          }
        })
      }

      const runRow = toBigQueryRunRow(run)

      await bigQuery.query({
        query: `INSERT INTO \`${projectId}.${ICO_DATASET}.ai_enrichment_runs\` (
                  run_id, trigger_event_id, space_id, period_year, period_month,
                  trigger_type, status, signals_seen, signals_enriched, signals_failed,
                  model_id, prompt_version, prompt_hash, tokens_in, tokens_out,
                  latency_ms, error_message, started_at, completed_at, _synced_at
                )
                SELECT
                  s.run_id, s.trigger_event_id, s.space_id, s.period_year, s.period_month,
                  s.trigger_type, s.status, s.signals_seen, s.signals_enriched, s.signals_failed,
                  s.model_id, s.prompt_version, s.prompt_hash, s.tokens_in, s.tokens_out,
                  s.latency_ms, s.error_message, TIMESTAMP(s.started_at), TIMESTAMP(s.completed_at), TIMESTAMP(s._synced_at)
                FROM UNNEST(@rows) AS s`,
        params: { rows: [runRow] },
        types: {
          rows: [{
            run_id: 'STRING',
            trigger_event_id: 'STRING',
            space_id: 'STRING',
            period_year: 'INT64',
            period_month: 'INT64',
            trigger_type: 'STRING',
            status: 'STRING',
            signals_seen: 'INT64',
            signals_enriched: 'INT64',
            signals_failed: 'INT64',
            model_id: 'STRING',
            prompt_version: 'STRING',
            prompt_hash: 'STRING',
            tokens_in: 'INT64',
            tokens_out: 'INT64',
            latency_ms: 'INT64',
            error_message: 'STRING',
            // TASK-941/ISSUE-082: STRING + TIMESTAMP() cast en SELECT (no 'TIMESTAMP' en struct → NULL)
            started_at: 'STRING',
            completed_at: 'STRING',
            _synced_at: 'STRING'
          }]
        }
      })
    } catch (bqError) {
      console.warn('[llm-enrichment] BigQuery write skipped (streaming buffer or transient error), persisting to PostgreSQL serving:', bqError instanceof Error ? bqError.message : bqError)
    }
  }

  await persistServingState(records, run, { historyOnly, signalsUnmappable })

  if (!historyOnly) {
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
  }

  return {
    run,
    recordsWritten: records.length,
    succeeded,
    failed,
    skipped
  }
}
