import { createHash } from 'node:crypto'

import type { AiSignalRecord } from './types'

export const ICO_LLM_PROMPT_VERSION = 'ico_signal_enrichment_v1'
export const ICO_LLM_DEFAULT_MODEL_ID = 'google/gemini-2.5-flash@default'
export const ICO_LLM_SUPPORTED_SIGNAL_TYPES = ['anomaly', 'prediction', 'root_cause', 'recommendation'] as const
export const ICO_LLM_ENRICHMENT_STATUSES = ['succeeded', 'failed', 'skipped'] as const
export const ICO_LLM_RUN_STATUSES = ['succeeded', 'partial', 'failed'] as const

export type IcoLlmSupportedSignalType = (typeof ICO_LLM_SUPPORTED_SIGNAL_TYPES)[number]
export type IcoLlmEnrichmentStatus = (typeof ICO_LLM_ENRICHMENT_STATUSES)[number]
export type IcoLlmRunStatus = (typeof ICO_LLM_RUN_STATUSES)[number]

export interface AiSignalEnrichmentModelOutput {
  qualityScore: number
  explanationSummary: string
  rootCauseNarrative: string
  recommendedAction: string
  confidence: number
}

export interface AiSignalEnrichmentRecord {
  enrichmentId: string
  runId: string
  signalId: string
  spaceId: string
  memberId: string | null
  projectId: string | null
  signalType: IcoLlmSupportedSignalType
  metricName: string
  periodYear: number
  periodMonth: number
  severity: string | null
  qualityScore: number | null
  explanationSummary: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  explanationJson: AiSignalEnrichmentModelOutput | Record<string, unknown>
  modelId: string
  promptVersion: string
  promptHash: string
  confidence: number | null
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number | null
  status: IcoLlmEnrichmentStatus
  errorMessage: string | null
  inputSignalSnapshot: Record<string, unknown>
  processedAt: string
}

export interface AiEnrichmentRunRecord {
  runId: string
  triggerEventId: string | null
  spaceId: string | null
  periodYear: number
  periodMonth: number
  triggerType: string
  status: IcoLlmRunStatus
  signalsSeen: number
  signalsEnriched: number
  signalsFailed: number
  modelId: string
  promptVersion: string
  promptHash: string
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface AgencyAiLlmSummaryItem {
  enrichmentId: string
  signalId: string
  signalType: string
  spaceId: string
  metricName: string
  severity: string | null
  qualityScore: number | null
  explanationSummary: string | null
  recommendedAction: string | null
  confidence: number | null
  processedAt: string
}

export interface AgencyAiLlmSummary {
  totals: {
    total: number
    succeeded: number
    failed: number
    avgQualityScore: number | null
  }
  latestRun: {
    runId: string
    status: IcoLlmRunStatus
    startedAt: string
    completedAt: string | null
    signalsSeen: number
    signalsEnriched: number
    signalsFailed: number
  } | null
  recentEnrichments: AgencyAiLlmSummaryItem[]
  lastProcessedAt: string | null
}

export interface OrganizationAiLlmEnrichmentItem {
  signalId: string
  spaceId: string
  metricName: string
  signalType: string
  severity: string | null
  qualityScore: number | null
  explanationSummary: string | null
  recommendedAction: string | null
  confidence: number | null
  processedAt: string
}

const PROMPT_TEMPLATE_LINES = [
  'Eres el carril advisory-only del ICO Engine de Greenhouse.',
  'Analiza una señal AI ya materializada y devuelve solo JSON.',
  'No inventes datos ni cambies el significado del signal.',
  'La explicación debe ser breve, operativa e internal-only.',
  'Si la evidencia es insuficiente, baja la confianza y dilo explícitamente.'
]

export const ICO_LLM_PROMPT_TEMPLATE = PROMPT_TEMPLATE_LINES.join('\n')

export const buildIcoLlmPromptHash = () =>
  createHash('sha256')
    .update(ICO_LLM_PROMPT_TEMPLATE)
    .digest('hex')

export const toSerializableSignalSnapshot = (signal: AiSignalRecord) => ({
  signalId: signal.signalId,
  signalType: signal.signalType,
  spaceId: signal.spaceId,
  memberId: signal.memberId,
  projectId: signal.projectId,
  metricName: signal.metricName,
  periodYear: signal.periodYear,
  periodMonth: signal.periodMonth,
  severity: signal.severity,
  currentValue: signal.currentValue,
  expectedValue: signal.expectedValue,
  zScore: signal.zScore,
  predictedValue: signal.predictedValue,
  confidence: signal.confidence,
  predictionHorizon: signal.predictionHorizon,
  contributionPct: signal.contributionPct,
  dimension: signal.dimension,
  dimensionId: signal.dimensionId,
  actionType: signal.actionType,
  actionSummary: signal.actionSummary,
  actionTargetId: signal.actionTargetId,
  modelVersion: signal.modelVersion,
  generatedAt: signal.generatedAt,
  aiEligible: signal.aiEligible,
  payloadJson: signal.payloadJson
})

export const stableEnrichmentId = (signalId: string, promptHash: string) =>
  `EO-AIE-${createHash('sha1').update(`${signalId}|${promptHash}`).digest('hex').slice(0, 8)}`.toUpperCase()

export const stableRunId = (periodYear: number, periodMonth: number, promptHash: string) =>
  `EO-AIR-${createHash('sha1').update(`${periodYear}-${periodMonth}|${promptHash}|${Date.now()}`).digest('hex').slice(0, 8)}`.toUpperCase()
