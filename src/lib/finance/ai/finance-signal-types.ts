import { createHash } from 'node:crypto'

// ─── Signal metric registry ─────────────────────────────────────────────────

export const FINANCE_SIGNAL_METRIC_IDS = [
  'net_margin_pct',
  'gross_margin_pct',
  'total_revenue_clp',
  'direct_costs_clp',
  'indirect_costs_clp',
  'net_margin_clp'
] as const

export type FinanceSignalMetricId = (typeof FINANCE_SIGNAL_METRIC_IDS)[number]

export interface FinanceMetricDefinition {
  metricId: FinanceSignalMetricId
  shortName: string
  description: string
  unit: string
  higherIsBetter: boolean
}

export const FINANCE_METRIC_REGISTRY: readonly FinanceMetricDefinition[] = [
  {
    metricId: 'net_margin_pct',
    shortName: 'Net Margin',
    description: 'Margen neto del cliente sobre revenue',
    unit: '%',
    higherIsBetter: true
  },
  {
    metricId: 'gross_margin_pct',
    shortName: 'Gross Margin',
    description: 'Margen bruto del cliente sobre revenue',
    unit: '%',
    higherIsBetter: true
  },
  {
    metricId: 'total_revenue_clp',
    shortName: 'Revenue',
    description: 'Revenue total devengado del período',
    unit: 'CLP',
    higherIsBetter: true
  },
  {
    metricId: 'direct_costs_clp',
    shortName: 'Direct Costs',
    description: 'Costos directos asignados al cliente',
    unit: 'CLP',
    higherIsBetter: false
  },
  {
    metricId: 'indirect_costs_clp',
    shortName: 'Indirect Costs',
    description: 'Costos indirectos asignados al cliente',
    unit: 'CLP',
    higherIsBetter: false
  },
  {
    metricId: 'net_margin_clp',
    shortName: 'Net Result',
    description: 'Resultado neto del cliente en pesos',
    unit: 'CLP',
    higherIsBetter: true
  }
] as const

export const getFinanceMetricById = (metricId: string): FinanceMetricDefinition | undefined =>
  FINANCE_METRIC_REGISTRY.find(metric => metric.metricId === metricId)

// ─── Signal types ───────────────────────────────────────────────────────────

export const FINANCE_SIGNAL_TYPES = ['anomaly', 'prediction', 'root_cause', 'recommendation'] as const
export const FINANCE_SEVERITIES = ['info', 'warning', 'critical'] as const

export type FinanceSignalType = (typeof FINANCE_SIGNAL_TYPES)[number]
export type FinanceSeverity = (typeof FINANCE_SEVERITIES)[number]

export interface FinanceSignalRecord {
  signalId: string
  signalType: FinanceSignalType
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  metricName: FinanceSignalMetricId
  periodYear: number
  periodMonth: number
  severity: FinanceSeverity | null
  currentValue: number | null
  expectedValue: number | null
  zScore: number | null
  predictedValue: number | null
  confidence: number | null
  predictionHorizon: string | null
  contributionPct: number | null
  dimension: string | null
  dimensionId: string | null
  actionType: string | null
  actionSummary: string | null
  actionTargetId: string | null
  modelVersion: string
  generatedAt: string
  aiEligible: boolean
  payloadJson: Record<string, unknown>
}

// ─── LLM enrichment types ───────────────────────────────────────────────────

export const FINANCE_LLM_PROMPT_VERSION = 'finance_signal_enrichment_v1'
export const FINANCE_LLM_DEFAULT_MODEL_ID = 'google/gemini-2.5-flash@default'
export const FINANCE_LLM_SUPPORTED_SIGNAL_TYPES = ['anomaly', 'prediction', 'root_cause', 'recommendation'] as const
export const FINANCE_LLM_ENRICHMENT_STATUSES = ['succeeded', 'failed', 'skipped'] as const
export const FINANCE_LLM_RUN_STATUSES = ['succeeded', 'partial', 'failed'] as const

export type FinanceLlmSupportedSignalType = (typeof FINANCE_LLM_SUPPORTED_SIGNAL_TYPES)[number]
export type FinanceLlmEnrichmentStatus = (typeof FINANCE_LLM_ENRICHMENT_STATUSES)[number]
export type FinanceLlmRunStatus = (typeof FINANCE_LLM_RUN_STATUSES)[number]

export interface FinanceSignalEnrichmentModelOutput {
  qualityScore: number
  explanationSummary: string
  rootCauseNarrative: string
  recommendedAction: string
  confidence: number
}

export interface FinanceSignalEnrichmentRecord {
  enrichmentId: string
  runId: string
  signalId: string
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  signalType: FinanceLlmSupportedSignalType
  metricName: string
  periodYear: number
  periodMonth: number
  severity: string | null
  qualityScore: number | null
  explanationSummary: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  explanationJson: FinanceSignalEnrichmentModelOutput | Record<string, unknown>
  modelId: string
  promptVersion: string
  promptHash: string
  confidence: number | null
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number | null
  status: FinanceLlmEnrichmentStatus
  errorMessage: string | null
  processedAt: string
}

export interface FinanceEnrichmentRunRecord {
  runId: string
  triggerEventId: string | null
  organizationId: string | null
  clientId: string | null
  periodYear: number
  periodMonth: number
  triggerType: string
  status: FinanceLlmRunStatus
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

// ─── Nexa Insights payload (UI contract) ────────────────────────────────────

export interface FinanceNexaInsightItem {
  id: string
  signalType: string
  metricId: string
  severity: string | null
  explanation: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
}

export interface FinanceNexaInsightsPayload {
  totalAnalyzed: number
  lastAnalysis: string | null
  runStatus: FinanceLlmRunStatus | null
  insights: FinanceNexaInsightItem[]
}

// ─── Stable IDs ─────────────────────────────────────────────────────────────

export const stableFinanceSignalId = (parts: Array<string | number | null | undefined>) => {
  const hash = createHash('sha1')
    .update(['finance', ...parts].map(part => String(part ?? '')).join('|'))
    .digest('hex')
    .slice(0, 12)

  return `EO-FSIG-${hash}`.toUpperCase()
}

export const stableFinanceEnrichmentId = (signalId: string, promptHash: string) =>
  `EO-FAIE-${createHash('sha1').update(`${signalId}|${promptHash}`).digest('hex').slice(0, 8)}`.toUpperCase()

export const stableFinanceRunId = (periodYear: number, periodMonth: number, promptHash: string) =>
  `EO-FAIR-${createHash('sha1').update(`${periodYear}-${periodMonth}|${promptHash}|${Date.now()}`).digest('hex').slice(0, 8)}`.toUpperCase()

// ─── Helpers ────────────────────────────────────────────────────────────────

export const roundFinanceNumber = (value: number | null, decimals = 4) => {
  if (value === null || !Number.isFinite(value)) return null

  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

// ─── Prompt Template ────────────────────────────────────────────────────────

const buildFinanceMetricGlossary = (): string =>
  FINANCE_METRIC_REGISTRY.map(
    metric =>
      `- ${metric.metricId} → ${metric.shortName} — ${metric.description} [${metric.unit}, ${metric.higherIsBetter ? '↑ mejor' : '↓ mejor'}]`
  ).join('\n')

const FINANCE_CAUSAL_CHAIN = [
  'Revenue ↓ o Direct Costs ↑ → Gross Margin ↓ → Net Margin ↓ → flujo de caja operativo ↓',
  'Indirect Costs ↑ sin crecer revenue → Net Margin ↓ aun con Gross Margin estable',
  'Direct Costs ↑ concentrados en un cliente → Net Margin del cliente ↓ sin afectar margen agregado',
  'Revenue concentrado en pocos clientes → volatilidad alta de Net Margin mensual'
].join('\n')

const PROMPT_TEMPLATE_LINES = [
  'Eres el carril advisory-only del Finance Signal Engine de Greenhouse.',
  'Analiza una señal AI ya materializada sobre una métrica financiera y devuelve solo JSON.',
  'No inventes datos ni cambies el significado de la señal.',
  'La explicación debe ser breve, operativa e internal-only.',
  'Si la evidencia es insuficiente, baja la confianza y dilo explícitamente.',
  '',
  'Glosario de métricas financieras (usa siempre el nombre operativo, nunca el código):',
  buildFinanceMetricGlossary(),
  '',
  'Cadena causal financiera (usa para conectar impacto):',
  FINANCE_CAUSAL_CHAIN,
  '',
  'Reglas de narrativa:',
  '- Usa el nombre operativo de la métrica en inglés (Net Margin, Gross Margin, Revenue, Direct Costs, Indirect Costs, Net Result). Nunca el código técnico (net_margin_pct, direct_costs_clp).',
  '- Usa los nombres de cliente y organización en la narrativa, nunca los IDs técnicos.',
  '- Estructura la explicación en dos partes:',
  '  1. Impacto financiero: qué métrica se desvió, cuánto, y qué otras métricas del P&L presiona según la cadena causal.',
  '  2. Bajada operativa: qué significa esto para el negocio del cliente o la operación — en términos de rentabilidad, flujo de caja o riesgo.',
  '- Escribe en español con nombres de métricas en inglés (spanglish natural).',
  '- Cantidades monetarias siempre en CLP con formato legible (ej: "CLP 12.5M" o "$12,500,000").',
  '- Porcentajes con un decimal máximo (ej: "17.3%").',
  '',
  'Formato de menciones (obligatorio cuando refieras a entidades con ID):',
  '- Cliente: @[Nombre del Cliente](client:CLIENT_ID)',
  '- Organización: @[Nombre de la Organización](organization:ORG_ID)',
  '- Space: @[Nombre del Space](space:SPACE_ID)',
  '- Siempre incluye el nombre legible dentro de los corchetes y el ID entre paréntesis.',
  '- Si no tienes el ID de una entidad, menciona solo el nombre sin formato de mención.'
]

export const FINANCE_LLM_PROMPT_TEMPLATE = PROMPT_TEMPLATE_LINES.join('\n')

export const buildFinanceLlmPromptHash = () =>
  createHash('sha256')
    .update(FINANCE_LLM_PROMPT_TEMPLATE)
    .digest('hex')

export const toSerializableFinanceSignalSnapshot = (signal: FinanceSignalRecord) => ({
  signalId: signal.signalId,
  signalType: signal.signalType,
  organizationId: signal.organizationId,
  clientId: signal.clientId,
  spaceId: signal.spaceId,
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
  modelVersion: signal.modelVersion,
  generatedAt: signal.generatedAt,
  aiEligible: signal.aiEligible,
  payloadJson: signal.payloadJson
})
