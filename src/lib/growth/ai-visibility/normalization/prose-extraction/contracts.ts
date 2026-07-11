/**
 * TASK-1271 — Growth AI Visibility · Prose Extraction Router · Contracts.
 *
 * Contrato PURO (sin IO) del puerto `ProseExtractionProvider`: el paso cognitivo
 * que llena los campos de PROSA que el normalizer determinista deja en
 * `unknown`/`null`/`[]` (sentiment hacia la marca sujeto, category candidates,
 * messageDriftClaims, refinar `brandMentioned` ambiguo). Provider-agnóstico:
 * Anthropic/Gemini/OpenAI son adapters intercambiables detrás de este contrato.
 *
 * Invariantes (arch §Delta TASK-1271):
 *  - El extractor NUNCA asigna `grader_score` ni toca citations/sourceTypes/rank.
 *  - `unknown` es un resultado VÁLIDO, no un error.
 *  - La metadata (provider/model/cost/usage) NO contamina `NormalizedFinding`:
 *    viaja aparte para eval/observabilidad.
 *  - `categoryAssociations` aquí son CANDIDATOS crudos del proveedor; el mapeo a la
 *    taxonomía gobernada (TASK-1272) vive en la capa de dominio (`llm-extraction.ts`),
 *    no en el provider.
 */

import {
  BRAND_MENTIONED_VALUES,
  SENTIMENT_LABELS,
  type BrandMentioned,
  type SentimentLabel
} from '../contracts'

/** Versión del extractor de prosa. Cambiar el shape/semántica ⇒ bump (provenance). */
export const PROSE_EXTRACTION_VERSION = 'prose_extraction_v1' as const

/** Proveedores soportados por el router. `anthropic` es el default behavior-preserving. */
export const PROSE_EXTRACTION_PROVIDER_IDS = ['anthropic', 'gemini', 'openai'] as const
export type ProseExtractionProviderId = (typeof PROSE_EXTRACTION_PROVIDER_IDS)[number]

export const isProseExtractionProviderId = (value: unknown): value is ProseExtractionProviderId =>
  typeof value === 'string' && (PROSE_EXTRACTION_PROVIDER_IDS as readonly string[]).includes(value)

/** Entrada provider-agnóstica: solo el excerpt + marca/dominio (NUNCA PII del lead). */
export interface ProseExtractionInput {
  /** Excerpt de la respuesta del answer engine. Tratado como DATO (anti prompt-injection). */
  excerpt: string
  subjectBrand: string
  subjectDomain: string | null
  /** Tope de tokens de salida (presupuesto/circuit breaker). */
  maxTokens: number
}

/**
 * Shape crudo que devuelve un provider adapter. Espeja el schema forzado
 * (mismo contrato que el hook Anthropic original de TASK-1227). El router lo
 * valida/sanitiza antes de exponerlo.
 */
export interface ProseExtractionRawOutput {
  brandMentioned: BrandMentioned
  sentimentLabel: SentimentLabel
  sentimentScore: number | null
  /** Candidatos crudos del proveedor (strings). El dominio los mapea a taxonomía. */
  categoryAssociations: string[]
  messageDriftClaims: string[]
  confidence: number
}

export interface ProseExtractionUsage {
  inputTokens: number
  outputTokens: number
}

/** Respuesta del adapter: output crudo + modelo real + usage (para cost estimate). */
export interface ProseExtractionProviderResponse {
  data: ProseExtractionRawOutput
  model: string
  usage: ProseExtractionUsage
}

/**
 * Puerto del proveedor. `isConfigured` resuelve si el secret/credencial existe
 * (sin lanzar); `extract` ejecuta el modelo y LANZA en error de red/SDK/schema —
 * el router lo captura y degrada al finding determinista.
 */
export interface ProseExtractionProvider {
  readonly id: ProseExtractionProviderId
  isConfigured(): Promise<boolean>
  extract(input: ProseExtractionInput): Promise<ProseExtractionProviderResponse>
}

/**
 * Estado del intento de extracción (observabilidad/eval). `ok` = fields presentes.
 * TASK-1390: la fuente del enum vive en `../contracts` (el finding lo persiste);
 * acá se re-exporta para providers/router.
 */
export type { ProseExtractionStatus } from '../contracts'

import { type ProseExtractionStatus } from '../contracts'

/** Campos de prosa ya validados/sanitizados que el dominio puede mergear al finding. */
export interface ProseExtractionFields {
  brandMentioned: BrandMentioned
  sentimentLabel: SentimentLabel
  sentimentScore: number | null
  categoryAssociations: string[]
  messageDriftClaims: string[]
  confidence: number
}

/** Metadata interna (NUNCA al DTO público): para eval, cost guard y logs. */
export interface ProseExtractionMetadata {
  providerId: ProseExtractionProviderId | null
  model: string | null
  version: typeof PROSE_EXTRACTION_VERSION
  status: ProseExtractionStatus
  costEstimateUsd: number
  latencyMs: number
  usage: ProseExtractionUsage | null
}

/**
 * Resultado del router. `fields=null` ⇒ degradación honesta: el caller conserva el
 * finding determinista intacto. `metadata` SIEMPRE presente (incluso en fallback).
 */
export interface ProseExtractionResult {
  fields: ProseExtractionFields | null
  metadata: ProseExtractionMetadata
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const sanitizeStringArray = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, max)
    : []

/**
 * Valida + sanitiza el output crudo del proveedor. Devuelve `null` si el shape no
 * cumple el contrato mínimo (brandMentioned/sentimentLabel inválidos) ⇒ el router
 * lo trata como `schema_invalid` y degrada. PURO.
 */
export const sanitizeProseExtractionOutput = (raw: unknown): ProseExtractionFields | null => {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const data = raw as Record<string, unknown>

  const brandMentioned = data.brandMentioned
  const sentimentLabel = data.sentimentLabel

  if (!(BRAND_MENTIONED_VALUES as readonly unknown[]).includes(brandMentioned)) {
    return null
  }

  if (!(SENTIMENT_LABELS as readonly unknown[]).includes(sentimentLabel)) {
    return null
  }

  const sentimentScore =
    typeof data.sentimentScore === 'number' && data.sentimentScore >= -1 && data.sentimentScore <= 1
      ? data.sentimentScore
      : null

  return {
    brandMentioned: brandMentioned as BrandMentioned,
    sentimentLabel: sentimentLabel as SentimentLabel,
    sentimentScore,
    categoryAssociations: sanitizeStringArray(data.categoryAssociations, 8),
    messageDriftClaims: sanitizeStringArray(data.messageDriftClaims, 5),
    confidence: clamp01(typeof data.confidence === 'number' ? data.confidence : 0)
  }
}
