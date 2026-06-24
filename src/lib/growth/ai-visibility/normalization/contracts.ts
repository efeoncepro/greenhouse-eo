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
  'manual_import'
] as const

export type NormalizedFindingProvider = (typeof NORMALIZED_FINDING_PROVIDERS)[number]

export const BRAND_MENTIONED_VALUES = ['yes', 'no', 'ambiguous', 'unknown'] as const
export type BrandMentioned = (typeof BRAND_MENTIONED_VALUES)[number]

export const SENTIMENT_LABELS = ['positive', 'neutral', 'negative', 'mixed', 'unknown'] as const
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number]

export const COMMERCIAL_INTENT_MATCH_VALUES = ['yes', 'no', 'partial', 'unknown'] as const
export type CommercialIntentMatch = (typeof COMMERCIAL_INTENT_MATCH_VALUES)[number]

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
  confidence: 0,
  trustSignal: null,
  schemaVersion: NORMALIZED_FINDING_SCHEMA_VERSION
})
