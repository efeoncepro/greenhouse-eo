/**
 * TASK-1267 — Entity probe · Wikidata / Wikipedia (Slice 1).
 *
 * Read-only de la API pública de Wikidata: ¿la marca tiene una ENTRADA estructurada?
 * Wikidata es el backbone canónico de entidad que alimenta el Knowledge Graph de Google y
 * a los LLMs. Dos pasos read-only sobre `www.wikidata.org/w/api.php` (sin auth):
 *  1. `wbsearchentities` → candidatos por nombre.
 *  2. `wbgetentities` (claims P856 sitio oficial + sitelinks) → desambiguar por dominio.
 *
 * Honest degradation:
 *  - `wbsearchentities` falla → `failed`, score null.
 *  - Sin candidatos → `succeeded` score 0 (gap MEDIDO: no hay entrada Wikidata).
 *  - Candidato con sitio oficial (P856) que matchea el dominio → score alto (confirmado).
 *  - Candidato presente sin confirmación de dominio → score medio (riesgo de homónimo).
 *  - `wbgetentities` falla pero hubo candidato → score medio (degradación parcial honesta).
 */

import { type Probe, type ProbeContext, type ProbeOutcome, NO_ENTITY_CONTEXT_OUTCOME } from '../contracts'
import { localeToLanguage } from '../entity-fetch'
import { hostMatchesDomain, normalizeBrandName, safeJsonParse } from './shared'

interface WbSearchResponse {
  search?: Array<{ id?: string; label?: string; description?: string }>
}

interface WbEntity {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
  sitelinks?: Record<string, { title?: string }>
}

interface WbGetResponse {
  entities?: Record<string, WbEntity>
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

/** Extrae los sitios oficiales (P856) de un entity de Wikidata. */
const officialSites = (entity: WbEntity): string[] => {
  const claims = entity.claims?.P856 ?? []

  return claims
    .map(c => c.mainsnak?.datavalue?.value)
    .filter((v): v is string => typeof v === 'string')
}

const wikipediaSitelinkCount = (entity: WbEntity): number =>
  Object.keys(entity.sitelinks ?? {}).filter(k => k.endsWith('wiki')).length

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const entity = ctx.entity

  if (!entity) return NO_ENTITY_CONTEXT_OUTCOME

  const language = localeToLanguage(entity.locale)

  const searchUrl =
    `${WIKIDATA_API}?action=wbsearchentities&format=json&type=item&limit=5` +
    `&search=${encodeURIComponent(entity.brandName)}` +
    `&language=${encodeURIComponent(language)}&uselang=${encodeURIComponent(language)}`

  const searchRes = await entity.fetch(searchUrl)

  if (!searchRes.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo consultar la búsqueda de entidades de Wikidata; señal no medible.',
      evidence: { status: searchRes.status },
      errorCode: searchRes.errorCode ?? 'http_error'
    }
  }

  const candidates = safeJsonParse<WbSearchResponse>(searchRes.body)?.search ?? []

  if (candidates.length === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'La marca no tiene entrada en Wikidata: falta el backbone de entidad que alimenta a los motores.',
      evidence: { candidates: 0, domainConfirmed: false }
    }
  }

  const ids = candidates
    .map(c => c.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 3)

  const getUrl =
    `${WIKIDATA_API}?action=wbgetentities&format=json&props=claims%7Csitelinks` +
    `&ids=${encodeURIComponent(ids.join('|'))}`

  const getRes = await entity.fetch(getUrl)
  const entities = getRes.ok ? safeJsonParse<WbGetResponse>(getRes.body)?.entities ?? {} : {}

  let domainConfirmedId: string | null = null
  let bestWikiCount = 0

  for (const id of ids) {
    const ent = entities[id]

    if (!ent) continue

    bestWikiCount = Math.max(bestWikiCount, wikipediaSitelinkCount(ent))

    if (officialSites(ent).some(site => hostMatchesDomain(site, entity.domain))) {
      domainConfirmedId = id
      break
    }
  }

  const normalizedBrand = normalizeBrandName(entity.brandName)
  const labelMatch = candidates.some(c => normalizeBrandName(c.label ?? '') === normalizedBrand)
  const couldFetchEntities = getRes.ok && Object.keys(entities).length > 0

  // Score: confirmado por sitio oficial (100) → entrada con Wikipedia sin confirmar dominio
  // (65) → candidato por nombre sin confirmación fuerte (50, riesgo de homónimo).
  let score: number
  let reason: string

  if (domainConfirmedId) {
    score = 100
    reason = `Entrada en Wikidata confirmada por sitio oficial${bestWikiCount > 0 ? ` (con ${bestWikiCount} página(s) de Wikipedia)` : ''}.`
  } else if (bestWikiCount > 0) {
    score = 65
    reason = 'Hay una entrada en Wikidata con página de Wikipedia, pero sin confirmar el dominio oficial (posible homónimo).'
  } else {
    score = 50
    reason = couldFetchEntities
      ? 'Hay candidatos en Wikidata para el nombre, sin sitio oficial ni Wikipedia que confirmen la marca (posible homónimo).'
      : 'Hay candidatos en Wikidata para el nombre; no se pudo confirmar el dominio (degradación parcial).'
  }

  return {
    status: 'succeeded',
    score,
    reason,
    evidence: {
      candidates: candidates.length,
      domainConfirmed: Boolean(domainConfirmedId),
      labelMatch,
      wikipediaSitelinks: bestWikiCount,
      entitiesFetched: couldFetchEntities
    }
  }
}

export const wikidataProbe: Probe = {
  kind: 'wikidata',
  axis: 'entity',
  requiresHeadless: false,
  run
}
