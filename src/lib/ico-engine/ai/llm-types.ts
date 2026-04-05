import { createHash } from 'node:crypto'

import { ICO_METRIC_REGISTRY } from '../metric-registry'
import type { AiSignalRecord } from './types'

export const ICO_LLM_PROMPT_VERSION = 'ico_signal_enrichment_v3'
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

// ─── Metric Glossary (dynamic from registry) ──────────────────────────────

const buildMetricGlossary = (): string => {
  const lines = ICO_METRIC_REGISTRY.map(
    m => `- ${m.code} → ${m.shortName} — ${m.description} [${m.unit}, ${m.higherIsBetter ? '↑ mejor' : '↓ mejor'}]`
  )

  lines.push('- rpa_avg → RpA (alias de rpa)')

  return lines.join('\n')
}

// ─── Causal Chain (from Contrato_Metricas_ICO §5) ─────────────────────────

const ICO_CAUSAL_CHAIN = [
  'BCS ↑ → FTR% ↑ → RpA ↓ → Cycle Time ↓ → TTM ↓ → Revenue Enabled ↑',
  'FTR% ↑ → Throughput ↑ → Throughput Expandido (RE)',
  'OTD% ↑ → TTM ↓ → Early Launch Advantage (RE)',
  'RpA ↓ → menor costo de producción → Throughput ↑'
].join('\n')

// ─── Prompt Template ───────────────────────────────────────────────────────

const PROMPT_TEMPLATE_LINES = [
  'Eres el carril advisory-only del ICO Engine de Greenhouse.',
  'Analiza una señal AI ya materializada y devuelve solo JSON.',
  'No inventes datos ni cambies el significado del signal.',
  'La explicación debe ser breve, operativa e internal-only.',
  'Si la evidencia es insuficiente, baja la confianza y dilo explícitamente.',
  '',
  'Glosario de métricas ICO (usa siempre el nombre operativo, nunca el código):',
  buildMetricGlossary(),
  '',
  'Cadena causal entre métricas (usa para conectar impacto):',
  ICO_CAUSAL_CHAIN,
  '',
  'Reglas de narrativa:',
  '- Usa el nombre operativo de la métrica en inglés (FTR%, RpA, OTD%). Nunca el código técnico (ftr_pct, rpa_avg).',
  '- Usa los nombres de Space, miembro y proyecto en la narrativa, nunca los IDs técnicos.',
  '- Estructura la explicación en dos partes:',
  '  1. Impacto técnico: qué métrica se desvió, cuánto, y qué otras métricas presiona según la cadena causal.',
  '  2. Bajada operativa: qué significa esto para alguien que no conoce las métricas — en términos de equipo, entregas y capacidad.',
  '- Escribe en español con nombres de métricas en inglés (spanglish natural).',
  '',
  'Formato de menciones (obligatorio cuando refieras a entidades con ID):',
  '- Miembro del equipo: @[Nombre Completo](member:MEMBER_ID)',
  '- Space o cliente: @[Nombre del Space](space:SPACE_ID)',
  '- Proyecto: @[Nombre del Proyecto](project:PROJECT_ID)',
  '- Siempre incluye el nombre legible dentro de los corchetes y el ID entre paréntesis.',
  '- Si no tienes el ID de una entidad, menciona solo el nombre sin formato de mención.'
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
