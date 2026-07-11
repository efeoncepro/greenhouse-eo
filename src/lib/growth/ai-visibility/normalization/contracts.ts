/**
 * TASK-1227 — Growth AI Visibility · NormalizedFinding contract (Slice 1).
 *
 * Contrato V1 del finding normalizado derivado de una `ProviderObservation`
 * (TASK-1226). PURO (sin IO). Invariantes (arch §7.5 + Delta TASK-1227):
 *  - Provider output NO es verdad: todo campo derivado preserva `unknown`/`null`/`[]`
 *    cuando la evidencia no alcanza. NUNCA se inventan rank/competidores/citations.
 *  - El finding es la unidad comparable; el score se deriva DESPUÉS (scoring/).
 *  - schemaVersion fija el contrato; cambios → versión nueva.
 */

import {
  GROWTH_AI_VISIBILITY_SOURCE_TYPES,
  type GrowthAiVisibilitySourceType
} from '../contracts'

export const NORMALIZED_FINDING_SCHEMA_VERSION = 'normalized_finding_v1' as const

/** Provider del finding: providers del grader + `manual_import` (evidencia cargada a mano). */
export const NORMALIZED_FINDING_PROVIDERS = [
  'openai',
  'anthropic',
  'perplexity',
  'gemini',
  'google_ai_overview',
  'manual_import'
] as const

export type NormalizedFindingProvider = (typeof NORMALIZED_FINDING_PROVIDERS)[number]

/**
 * Surfaces canónicas del grader (taxonomía de producto, TASK-1265 delta 2026-06-28).
 *
 * Dos superficies de respuesta IA estructuralmente distintas; ambas miden lo mismo
 * ("¿te mencionan/citan en la respuesta generada?"), pero el canal cambia:
 *   - `answer_engines` — asistentes conversacionales (el usuario VA al chatbot):
 *     ChatGPT (OpenAI), Claude (Anthropic), Perplexity, Gemini.
 *   - `ai_search` — respuesta IA dentro del SERP (la IA está en la búsqueda que el
 *     usuario ya usa): Google AI Overviews / AI Mode (→ futuro Bing Copilot).
 *
 * Naming en inglés a propósito (término estándar AEO/GEO; se trata como marca de
 * producto, NO se traduce). Las labels visibles viven en `src/lib/copy/growth.ts`.
 */
export const GRADER_ENGINE_SURFACES = ['answer_engines', 'ai_search'] as const
export type GraderEngineSurface = (typeof GRADER_ENGINE_SURFACES)[number]

/** Clasificación motor → surface. `manual_import` = evidencia cargada por operador, sin surface propia. */
export const GRADER_PROVIDER_SURFACE = {
  openai: 'answer_engines',
  anthropic: 'answer_engines',
  perplexity: 'answer_engines',
  gemini: 'answer_engines',
  google_ai_overview: 'ai_search'
} as const satisfies Record<Exclude<NormalizedFindingProvider, 'manual_import'>, GraderEngineSurface>

export const BRAND_MENTIONED_VALUES = ['yes', 'no', 'ambiguous', 'unknown'] as const
export type BrandMentioned = (typeof BRAND_MENTIONED_VALUES)[number]

export const SENTIMENT_LABELS = ['positive', 'neutral', 'negative', 'mixed', 'unknown'] as const
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number]

export const COMMERCIAL_INTENT_MATCH_VALUES = ['yes', 'no', 'partial', 'unknown'] as const
export type CommercialIntentMatch = (typeof COMMERCIAL_INTENT_MATCH_VALUES)[number]

/**
 * TASK-1390 (ISSUE-120 Gap C) — estado del intento de extracción de prosa.
 * Vive acá (y no en prose-extraction/contracts) porque el finding lo persiste;
 * prose-extraction lo re-exporta para sus providers/router.
 */
export const PROSE_EXTRACTION_STATUSES = [
  'ok',
  'disabled',
  'not_configured',
  'empty_excerpt',
  'schema_invalid',
  'provider_error'
] as const

export type ProseExtractionStatus = (typeof PROSE_EXTRACTION_STATUSES)[number]

/**
 * Resultado del intento de extracción de prosa sobre el finding. `ran=false` con su
 * `status` hace la degradación DIAGNOSTICABLE (antes se descartaba y `sentiment
 * unknown` era indistinguible de "no corrió"). `null` = finding anterior al contrato v2.
 */
export interface ProseExtractionOutcome {
  ran: boolean
  status: ProseExtractionStatus
  provider: string | null
}

export interface NormalizedFinding {
  findingId: string
  runId: string
  promptId: string
  provider: NormalizedFindingProvider
  brandMentioned: BrandMentioned
  brandRank: number | null
  competitorsMentioned: string[]
  sentimentLabel: SentimentLabel
  sentimentScore: number | null
  categoryAssociations: string[]
  messageDriftClaims: string[]
  citationDomains: string[]
  sourceTypes: GrowthAiVisibilitySourceType[]
  commercialIntentMatch: CommercialIntentMatch
  /** TASK-1390: resultado del intento de extracción de prosa; null = finding anterior al contrato v2. */
  proseExtraction: ProseExtractionOutcome | null
  /** Trazabilidad de confianza del muestreo (0..1): fracción de runs que coinciden / certeza de extracción. */
  confidence: number
  /** Señal de confianza/reputación opcional (ej. `no_independent_reviews_found`); null si no aplica. */
  trustSignal: string | null
  schemaVersion: typeof NORMALIZED_FINDING_SCHEMA_VERSION
}

// ── Type guards ──────────────────────────────────────────────────────────────

export const isNormalizedFindingProvider = (value: unknown): value is NormalizedFindingProvider =>
  typeof value === 'string' && (NORMALIZED_FINDING_PROVIDERS as readonly string[]).includes(value)

const isBrandMentioned = (value: unknown): value is BrandMentioned =>
  typeof value === 'string' && (BRAND_MENTIONED_VALUES as readonly string[]).includes(value)

const isSentimentLabel = (value: unknown): value is SentimentLabel =>
  typeof value === 'string' && (SENTIMENT_LABELS as readonly string[]).includes(value)

const isCommercialIntentMatch = (value: unknown): value is CommercialIntentMatch =>
  typeof value === 'string' && (COMMERCIAL_INTENT_MATCH_VALUES as readonly string[]).includes(value)

const isProseExtractionStatus = (value: unknown): value is ProseExtractionStatus =>
  typeof value === 'string' && (PROSE_EXTRACTION_STATUSES as readonly string[]).includes(value)

const isProseExtractionOutcome = (value: unknown): value is ProseExtractionOutcome => {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>

  return (
    typeof o.ran === 'boolean' &&
    isProseExtractionStatus(o.status) &&
    (o.provider === null || typeof o.provider === 'string')
  )
}

const isSourceType = (value: unknown): value is GrowthAiVisibilitySourceType =>
  typeof value === 'string' && (GROWTH_AI_VISIBILITY_SOURCE_TYPES as readonly string[]).includes(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

/**
 * Validación estricta (sin Zod): valida shape + enums + rangos. Lanza con mensaje
 * sanitizado (sin raw provider text). Devuelve el finding tipado.
 */
export const validateNormalizedFinding = (input: unknown): NormalizedFinding => {
  if (typeof input !== 'object' || input === null) {
    throw new Error('NormalizedFinding inválido: no es un objeto.')
  }

  const f = input as Record<string, unknown>

  const fail = (field: string): never => {
    throw new Error(`NormalizedFinding inválido: campo "${field}".`)
  }

  if (typeof f.findingId !== 'string' || f.findingId.length === 0) fail('findingId')
  if (typeof f.runId !== 'string' || f.runId.length === 0) fail('runId')
  if (typeof f.promptId !== 'string' || f.promptId.length === 0) fail('promptId')
  if (!isNormalizedFindingProvider(f.provider)) fail('provider')
  if (!isBrandMentioned(f.brandMentioned)) fail('brandMentioned')

  if (!(f.brandRank === null || (typeof f.brandRank === 'number' && Number.isFinite(f.brandRank) && f.brandRank >= 1))) {
    fail('brandRank')
  }

  if (!isStringArray(f.competitorsMentioned)) fail('competitorsMentioned')
  if (!isSentimentLabel(f.sentimentLabel)) fail('sentimentLabel')

  if (!(f.sentimentScore === null || (typeof f.sentimentScore === 'number' && f.sentimentScore >= -1 && f.sentimentScore <= 1))) {
    fail('sentimentScore')
  }

  if (!isStringArray(f.categoryAssociations)) fail('categoryAssociations')
  if (!isStringArray(f.messageDriftClaims)) fail('messageDriftClaims')
  if (!isStringArray(f.citationDomains)) fail('citationDomains')
  if (!(Array.isArray(f.sourceTypes) && f.sourceTypes.every(isSourceType))) fail('sourceTypes')
  if (!isCommercialIntentMatch(f.commercialIntentMatch)) fail('commercialIntentMatch')
  // Campo TASK-1390: los findings/payloads legacy no lo traen — ausencia ≡ null.
  if (!(f.proseExtraction == null || isProseExtractionOutcome(f.proseExtraction))) fail('proseExtraction')
  if (!(typeof f.confidence === 'number' && f.confidence >= 0 && f.confidence <= 1)) fail('confidence')
  if (!(f.trustSignal === null || typeof f.trustSignal === 'string')) fail('trustSignal')
  if (f.schemaVersion !== NORMALIZED_FINDING_SCHEMA_VERSION) fail('schemaVersion')

  return input as NormalizedFinding
}

export const isNormalizedFinding = (input: unknown): input is NormalizedFinding => {
  try {
    validateNormalizedFinding(input)

    return true
  } catch {
    return false
  }
}

/**
 * Factory con defaults seguros: todo `unknown`/`null`/`[]`. El normalizer
 * sobrescribe SOLO lo que la evidencia soporta (preserva unknown por construcción).
 */
export const createEmptyNormalizedFinding = (input: {
  findingId: string
  runId: string
  promptId: string
  provider: NormalizedFindingProvider
}): NormalizedFinding => ({
  findingId: input.findingId,
  runId: input.runId,
  promptId: input.promptId,
  provider: input.provider,
  brandMentioned: 'unknown',
  brandRank: null,
  competitorsMentioned: [],
  sentimentLabel: 'unknown',
  sentimentScore: null,
  categoryAssociations: [],
  messageDriftClaims: [],
  citationDomains: [],
  sourceTypes: [],
  commercialIntentMatch: 'unknown',
  proseExtraction: null,
  confidence: 0,
  trustSignal: null,
  schemaVersion: NORMALIZED_FINDING_SCHEMA_VERSION
})

/** Statuses de extracción que constituyen degradación NO intencional (alimenta la señal de reliability). */
export const PROSE_EXTRACTION_DEGRADED_STATUSES = ['not_configured', 'schema_invalid', 'provider_error'] as const

/** Agregado diagnosticable del intento de extracción de prosa de un set de findings (TASK-1390 Gap C). */
export interface ProseExtractionSummary {
  total: number
  ran: number
  degraded: number
  byStatus: Partial<Record<ProseExtractionStatus, number>>
}

export const summarizeProseExtraction = (findings: NormalizedFinding[]): ProseExtractionSummary => {
  const byStatus: Partial<Record<ProseExtractionStatus, number>> = {}
  let ran = 0
  let degraded = 0

  for (const finding of findings) {
    const outcome = finding.proseExtraction

    if (!outcome) {
      continue
    }

    byStatus[outcome.status] = (byStatus[outcome.status] ?? 0) + 1

    if (outcome.ran) {
      ran += 1
    }

    if ((PROSE_EXTRACTION_DEGRADED_STATUSES as readonly string[]).includes(outcome.status)) {
      degraded += 1
    }
  }

  return { total: findings.length, ran, degraded, byStatus }
}
