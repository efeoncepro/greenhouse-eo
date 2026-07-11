/**
 * TASK-1227 — Growth AI Visibility · Deterministic normalizer (Slice 2).
 *
 * Normaliza una `ProviderObservation` (TASK-1226) en un `NormalizedFinding` SIN
 * LLM: extrae lo que la evidencia ESTRUCTURADA soporta (citations/dominios,
 * presencia por dominio, intent del prompt) y PRESERVA `unknown`/`[]`/`null` en
 * los campos de prosa (sentiment, categoryAssociations, messageDriftClaims) — el
 * enriquecimiento de prosa es el hook LLM aislado (`llm-extraction.ts`, flag OFF).
 *
 * Hallazgo clave del spike (TASK-1228): la presencia de marca se desambigua por
 * DOMINIO (`efeoncepro.com`), NO por name-match ingenuo (colisión con `f11.es`).
 */

import { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1 } from '../prompt-packs/prompt-pack-v1'
import { MESSAGE_RECALL_STAGE, isRevenueIntentStage, type PromptTag } from '../prompt-packs/tag-vocabulary'
import {
  type GrowthAiVisibilityProviderObservation,
  type GrowthAiVisibilitySourceType
} from '../contracts'
import {
  createEmptyNormalizedFinding,
  type CommercialIntentMatch,
  type NormalizedFinding,
  type NormalizedFindingProvider
} from './contracts'
import { classifySourceType } from './source-type-classifier'

export interface NormalizationContext {
  /** Nombre de la marca sujeto del grado. */
  subjectBrand: string
  /** Dominio canónico del sujeto (para desambiguación por dominio). null si no se conoce. */
  subjectDomain: string | null
  /** Competidores declarados por el operador. */
  competitorsDeclared: string[]
  /** Override del finding id (default = observationId). */
  findingId?: string
  /**
   * TASK-1290 Slice 0 — tags del prompt del set RESUELTO del run. El normalizer los lee de acá,
   * NO del pack estático. `null`/ausente → fallback al pack v1 por id (runs legacy / caso agencia).
   */
  promptTags?: PromptTag | null
}

/** Fallback: tags del pack estático v1 por id (runs legacy sin tags persistidos / caso agencia). */
const staticPackTag = (promptId: string): PromptTag | undefined => {
  const prompt = GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(p => p.id === promptId)

  return prompt
    ? { family: prompt.family, fanOutType: prompt.fanOutType, intentStage: prompt.intentStage, namesBrand: prompt.namesBrand }
    : undefined
}

/** Resuelve los tags de un prompt: del set del run (preferido) o del pack estático (fallback). */
const resolvePromptTag = (promptId: string, runTag: PromptTag | null | undefined): PromptTag | undefined =>
  runTag ?? staticPackTag(promptId)

const normalizeForMatch = (value: string): string => value.toLowerCase().trim()

/** ¿El nombre de marca aparece como palabra en el excerpt? (match por límites de palabra, case-insensitive). */
const nameAppearsInText = (name: string, text: string): boolean => {
  const needle = normalizeForMatch(name)

  if (needle.length < 2) {
    return false
  }

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text)
}

const dedupe = (values: string[]): string[] => [...new Set(values.filter(Boolean))]

/**
 * TASK-1390 (ISSUE-120 Gap A): el `sourceType` explícito del provider manda; sin él,
 * clasificación determinista por dominio (antes todo caía a 'unknown' y
 * `citation_quality` era estructuralmente 0).
 */
const resolveSourceTypes = (
  observation: GrowthAiVisibilityProviderObservation,
  subjectDomain: string | null
): GrowthAiVisibilitySourceType[] => {
  if (observation.citations.length === 0) {
    return []
  }

  return dedupe(
    observation.citations.map(citation => citation.sourceType ?? classifySourceType(citation.domain, subjectDomain))
  ) as GrowthAiVisibilitySourceType[]
}

interface BrandPresence {
  brandMentioned: NormalizedFinding['brandMentioned']
  confidence: number
}

const resolveBrandPresence = (
  observation: GrowthAiVisibilityProviderObservation,
  context: NormalizationContext,
  citationDomains: string[],
  tag: PromptTag | undefined
): BrandPresence => {
  const excerpt = observation.answerExcerpt ?? ''
  const domainCited = context.subjectDomain ? citationDomains.includes(context.subjectDomain) : false
  const nameInExcerpt = nameAppearsInText(context.subjectBrand, excerpt)
  const isDiscovery = tag ? !tag.namesBrand : false

  // Presencia confirmada por dominio del sujeto → señal fuerte.
  if (domainCited) {
    return { brandMentioned: 'yes', confidence: 0.85 }
  }

  // Descubrimiento (el prompt NO nombra la marca): ausencia de dominio + nombre = gap AEO de alta confianza.
  if (isDiscovery) {
    if (nameInExcerpt) {
      // Nombre sin confirmación de dominio: puede ser homónimo → presencia de baja confianza.
      return { brandMentioned: 'yes', confidence: 0.5 }
    }

    return { brandMentioned: 'no', confidence: 0.85 }
  }

  // Prompt que nombra la marca: presencia por nombre (sin dominio = confianza media).
  if (nameInExcerpt) {
    return { brandMentioned: 'yes', confidence: 0.6 }
  }

  // Sin evidencia estructurada suficiente → preservar unknown.
  return { brandMentioned: 'unknown', confidence: 0.3 }
}

const resolveCommercialIntent = (
  brandMentioned: NormalizedFinding['brandMentioned'],
  tag: PromptTag | undefined
): CommercialIntentMatch => {
  if (!tag) {
    return 'unknown'
  }

  if (isRevenueIntentStage(tag.intentStage)) {
    if (brandMentioned === 'yes') return 'yes'
    if (brandMentioned === 'no') return 'no'

    return 'unknown'
  }

  if (tag.intentStage === MESSAGE_RECALL_STAGE) {
    return brandMentioned === 'yes' ? 'partial' : 'unknown'
  }

  // trust / risk / awareness / problem_aware: no es prompt de revenue intent.
  return brandMentioned === 'yes' || brandMentioned === 'no' ? 'no' : 'unknown'
}

const resolveCompetitors = (
  observation: GrowthAiVisibilityProviderObservation,
  context: NormalizationContext
): string[] => {
  const excerpt = observation.answerExcerpt ?? ''

  // OQ#2: declarados ∪ detectados. Determinista = declarados que aparecen en el excerpt.
  // Los "detectados" libres (no declarados) requieren extracción de prosa → LLM hook.
  return dedupe(context.competitorsDeclared.filter(competitor => nameAppearsInText(competitor, excerpt)))
}

/**
 * Normaliza una observación a un finding determinista. NUNCA inventa rank/
 * competidores/citations; preserva unknown donde la evidencia estructurada no
 * alcanza. Observaciones no exitosas (skipped/failed) → finding vacío (unknown).
 */
export const normalizeObservation = (
  observation: GrowthAiVisibilityProviderObservation,
  context: NormalizationContext
): NormalizedFinding => {
  const finding = createEmptyNormalizedFinding({
    findingId: context.findingId ?? observation.observationId,
    runId: observation.runId,
    promptId: observation.promptId,
    provider: observation.provider as NormalizedFindingProvider
  })

  // Sin evidencia (skip/fail) → todo unknown, confidence 0.
  if (observation.status !== 'succeeded') {
    return finding
  }

  const tag = resolvePromptTag(observation.promptId, context.promptTags)
  const citationDomains = dedupe(observation.citations.map(citation => citation.domain))
  const presence = resolveBrandPresence(observation, context, citationDomains, tag)

  return {
    ...finding,
    brandMentioned: presence.brandMentioned,
    competitorsMentioned: resolveCompetitors(observation, context),
    citationDomains,
    sourceTypes: resolveSourceTypes(observation, context.subjectDomain),
    commercialIntentMatch: resolveCommercialIntent(presence.brandMentioned, tag),
    confidence: presence.confidence
    // sentimentLabel/sentimentScore/categoryAssociations/messageDriftClaims/brandRank
    // quedan en su default unknown/null/[] — los enriquece el hook LLM (flag OFF).
  }
}
