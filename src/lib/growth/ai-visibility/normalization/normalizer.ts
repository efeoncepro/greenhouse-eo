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

import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  type GrowthAiVisibilityPromptDefinition
} from '../prompt-packs/prompt-pack-v1'
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

export interface NormalizationContext {
  /** Nombre de la marca sujeto del grado. */
  subjectBrand: string
  /** Dominio canónico del sujeto (para desambiguación por dominio). null si no se conoce. */
  subjectDomain: string | null
  /** Competidores declarados por el operador. */
  competitorsDeclared: string[]
  /** Override del finding id (default = observationId). */
  findingId?: string
}

/** Intent stages que representan intención de compra/comparación (revenue intent). */
const REVENUE_INTENT_STAGES = new Set(['consideration', 'comparison', 'purchase_intent', 'enterprise', 'local'])

const lookupPrompt = (promptId: string): GrowthAiVisibilityPromptDefinition | undefined =>
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(prompt => prompt.id === promptId)

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

const resolveSourceTypes = (
  observation: GrowthAiVisibilityProviderObservation
): GrowthAiVisibilitySourceType[] => {
  if (observation.citations.length === 0) {
    return []
  }

  return dedupe(
    observation.citations.map(citation => citation.sourceType ?? 'unknown')
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
  prompt: GrowthAiVisibilityPromptDefinition | undefined
): BrandPresence => {
  const excerpt = observation.answerExcerpt ?? ''
  const domainCited = context.subjectDomain ? citationDomains.includes(context.subjectDomain) : false
  const nameInExcerpt = nameAppearsInText(context.subjectBrand, excerpt)
  const isDiscovery = prompt ? !prompt.namesBrand : false

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
  prompt: GrowthAiVisibilityPromptDefinition | undefined
): CommercialIntentMatch => {
  if (!prompt) {
    return 'unknown'
  }

  if (REVENUE_INTENT_STAGES.has(prompt.intentStage)) {
    if (brandMentioned === 'yes') return 'yes'
    if (brandMentioned === 'no') return 'no'

    return 'unknown'
  }

  if (prompt.intentStage === 'message_recall') {
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

  const prompt = lookupPrompt(observation.promptId)
  const citationDomains = dedupe(observation.citations.map(citation => citation.domain))
  const presence = resolveBrandPresence(observation, context, citationDomains, prompt)

  return {
    ...finding,
    brandMentioned: presence.brandMentioned,
    competitorsMentioned: resolveCompetitors(observation, context),
    citationDomains,
    sourceTypes: resolveSourceTypes(observation),
    commercialIntentMatch: resolveCommercialIntent(presence.brandMentioned, prompt),
    confidence: presence.confidence
    // sentimentLabel/sentimentScore/categoryAssociations/messageDriftClaims/brandRank
    // quedan en su default unknown/null/[] — los enriquece el hook LLM (flag OFF).
  }
}
