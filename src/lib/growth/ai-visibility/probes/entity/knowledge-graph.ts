/**
 * TASK-1267 — Entity probe · Google Knowledge Graph (Slice 1).
 *
 * Read-only GET de la Knowledge Graph Search API: ¿la marca es una entidad CONOCIDA por
 * Google (tipo, descripción, panel)? Tener Knowledge Panel/entrada en el KG es una de las
 * causas estructurales de alta `entity_clarity`: los motores entienden quién es la marca.
 *
 * Honest degradation:
 *  - Sin API key (no configurada) → `skipped` (`not_configured`), score null.
 *  - Error de fetch / parse → `failed`, score null.
 *  - Respuesta OK SIN match → `succeeded` score 0 (gap real MEDIDO: no eres entidad KG).
 *  - Match confirmado por dominio (result.url ~ dominio del sujeto) → score alto.
 *  - Match por nombre sin confirmación de dominio → score medio (riesgo de homónimo).
 */

import { type Probe, type ProbeContext, type ProbeOutcome, NO_ENTITY_CONTEXT_OUTCOME } from '../contracts'
import { localeToLanguage } from '../entity-fetch'
import { hostMatchesDomain, normalizeBrandName, safeJsonParse } from './shared'

interface KgResult {
  '@type'?: string | string[]
  name?: string
  description?: string
  url?: string
  detailedDescription?: { articleBody?: string; url?: string }
}

interface KgResponse {
  itemListElement?: Array<{ result?: KgResult; resultScore?: number }>
}

const typesOf = (result: KgResult): string[] => {
  const raw = result['@type']
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []

  return list.map(t => String(t)).filter(t => t && t !== 'Thing')
}

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const entity = ctx.entity

  if (!entity) return NO_ENTITY_CONTEXT_OUTCOME

  if (!entity.knowledgeGraphApiKey) {
    return {
      status: 'skipped',
      score: null,
      reason: 'Google Knowledge Graph API key no configurada; señal no medible.',
      evidence: { configured: false },
      errorCode: 'not_configured'
    }
  }

  const language = localeToLanguage(entity.locale)

  const url =
    'https://kgsearch.googleapis.com/v1/entities:search' +
    `?query=${encodeURIComponent(entity.brandName)}` +
    `&key=${encodeURIComponent(entity.knowledgeGraphApiKey)}` +
    `&limit=5&languages=${encodeURIComponent(language)}&indent=false`

  const res = await entity.fetch(url)

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo consultar la Knowledge Graph API; señal no medible.',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const parsed = safeJsonParse<KgResponse>(res.body)
  const elements = parsed?.itemListElement ?? []

  if (elements.length === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'La marca no aparece como entidad en el Knowledge Graph de Google (sin Knowledge Panel).',
      evidence: { matches: 0, domainConfirmed: false }
    }
  }

  const normalizedBrand = normalizeBrandName(entity.brandName)

  // Preferir un match confirmado por dominio; si no, el de mayor resultScore.
  const domainMatch = elements.find(
    el =>
      el.result != null &&
      (hostMatchesDomain(el.result.url, entity.domain) ||
        hostMatchesDomain(el.result.detailedDescription?.url, entity.domain))
  )

  const best = domainMatch ?? elements[0]
  const result = best.result ?? {}
  const types = typesOf(result)
  const hasDescription = Boolean(result.description || result.detailedDescription?.articleBody)
  const nameMatch = normalizeBrandName(result.name ?? '') === normalizedBrand
  const domainConfirmed = Boolean(domainMatch)

  // Score: entidad confirmada por dominio (100) → match exacto de nombre con tipo+descr (75)
  // → match presente sin confirmación fuerte (60, posible homónimo).
  const score = domainConfirmed ? 100 : nameMatch && types.length > 0 && hasDescription ? 75 : 60

  return {
    status: 'succeeded',
    score,
    reason: domainConfirmed
      ? `Entidad reconocida en el Knowledge Graph y confirmada por dominio${types.length ? ` (${types.join(', ')})` : ''}.`
      : `Hay una entidad en el Knowledge Graph para el nombre, sin confirmación por dominio (posible homónimo)${types.length ? ` (${types.join(', ')})` : ''}.`,
    evidence: {
      matches: elements.length,
      domainConfirmed,
      nameMatch,
      types,
      hasDescription,
      resultScore: typeof best.resultScore === 'number' ? Math.round(best.resultScore) : null
    }
  }
}

export const knowledgeGraphProbe: Probe = {
  kind: 'knowledge_graph',
  axis: 'entity',
  requiresHeadless: false,
  run
}
