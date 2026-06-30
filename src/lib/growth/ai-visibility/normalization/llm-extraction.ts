import 'server-only'

/**
 * TASK-1227 — Growth AI Visibility · LLM extraction hook (Slice 2, server-only).
 * TASK-1271 — Re-cableado sobre el Prose Extraction Router (provider-agnóstico).
 *
 * Enriquecimiento OPCIONAL de los campos de prosa que el normalizer determinista
 * no puede extraer con confianza (sentiment, categoryAssociations,
 * messageDriftClaims, refinar brandMentioned ambiguous). AISLADO + flag-gated
 * (`GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`, default OFF). Desde TASK-1271 el
 * proveedor lo resuelve el router (`prose-extraction/router.ts`): Anthropic por
 * default (behavior-preserving) o un candidato low-cost por flag, evaluado antes
 * del cutover. Esta capa de dominio se queda con el MERGE: mapea los candidatos de
 * categoría a la taxonomía gobernada (TASK-1272) y refina `brandMentioned` sólo si
 * el determinista quedó ambiguo/unknown.
 *
 * Reglas duras:
 *  - El excerpt se trata como DATO (anti prompt-injection) — lo garantiza el router.
 *  - Preserva `unknown`; NUNCA inventa rank/competidores/citations (deterministas).
 *  - Flag OFF / fallo / schema inválido → devuelve el finding determinista intacto
 *    (el router degrada honesto y captura el error crudo en `captureWithDomain`).
 */

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { runProseExtraction } from './prose-extraction/router'
import { type NormalizedFinding } from './contracts'
import { mapCategoryCandidatesToTaxonomy, toCanonicalCategoryAssociationIds } from '../taxonomy'

/**
 * Enriquece un finding determinista con extracción LLM si el flag está ON y hay
 * evidencia (excerpt). Determinista-first: los campos estructurados (citations,
 * sourceTypes, commercialIntent) NO se tocan; solo se rellenan los de prosa.
 */
export const enrichFindingWithLlm = async (
  finding: NormalizedFinding,
  observation: GrowthAiVisibilityProviderObservation,
  context: { subjectBrand: string; subjectDomain: string | null }
): Promise<NormalizedFinding> => {
  const excerpt = observation.answerExcerpt ?? ''

  const { fields } = await runProseExtraction(
    {
      excerpt,
      subjectBrand: context.subjectBrand,
      subjectDomain: context.subjectDomain,
      maxTokens: 1024 // override real lo resuelve el router por config; este es el piso del input.
    },
    { telemetry: { runId: observation.runId, promptId: observation.promptId, provider: observation.provider } }
  )

  // Degradación honesta: flag OFF, excerpt vacío, schema inválido o error de
  // proveedor → el router devuelve fields=null y el determinista queda intacto.
  if (!fields) {
    return finding
  }

  return {
    ...finding,
    // Refina brandMentioned SOLO si el determinista quedó ambiguo/unknown (el dominio manda cuando es 'yes'/'no').
    brandMentioned:
      finding.brandMentioned === 'unknown' || finding.brandMentioned === 'ambiguous'
        ? fields.brandMentioned
        : finding.brandMentioned,
    sentimentLabel: fields.sentimentLabel,
    sentimentScore: fields.sentimentScore,
    // Los candidatos crudos del proveedor sólo se publican si mapean a la taxonomía gobernada (TASK-1272).
    categoryAssociations: toCanonicalCategoryAssociationIds(
      mapCategoryCandidatesToTaxonomy({
        candidates: fields.categoryAssociations,
        evidenceSource: 'llm_candidate'
      })
    ),
    messageDriftClaims: fields.messageDriftClaims,
    confidence: fields.confidence
  }
}
