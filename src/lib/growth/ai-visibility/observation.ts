/**
 * TASK-1226 — Growth AI Visibility Grader · Observation helpers (Slice 1).
 *
 * Helpers PUROS para construir, normalizar y serializar observaciones de
 * provider. Sin secretos ni IO de red; usa `node:crypto` solo para hashing
 * estable (request/answer hash), apto para test sin `server-only`.
 */

import { createHash } from 'node:crypto'

import {
  GROWTH_AI_VISIBILITY_EXCERPT_MAX,
  type GrowthAiVisibilityCitation,
  type GrowthAiVisibilityProviderObservation,
  type GrowthAiVisibilitySourceType
} from './contracts'

/** SHA-256 hex estable de un string (answer/request hash). */
export const sha256Hex = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex')

/** Recorta el texto al límite de retención del excerpt (bounded). */
export const boundedExcerpt = (text: string | null | undefined): string | null => {
  if (typeof text !== 'string') {
    return null
  }

  const trimmed = text.trim()

  if (trimmed.length === 0) {
    return null
  }

  return trimmed.slice(0, GROWTH_AI_VISIBILITY_EXCERPT_MAX)
}

/**
 * Extrae el dominio canónico (host sin `www.`) de una URL. Devuelve `null` si la
 * URL no es parseable. Clave para la desambiguación por dominio del normalizer
 * (TASK-1227): la colisión `efeoncepro.com` ↔ `f11.es` se resuelve por host.
 */
export const extractCitationDomain = (url: string): string | null => {
  try {
    const host = new URL(url).hostname.toLowerCase()

    return host.startsWith('www.') ? host.slice(4) : host
  } catch {
    return null
  }
}

/**
 * Normaliza un candidato a dominio (host pelado o "https://host/path"). Devuelve
 * el host sin `www.` si parece un dominio válido; null si no. Necesario para
 * providers cuya citation expone el dominio real en un campo aparte del url
 * (ej. Gemini/Vertex grounding: el `url` es un redirect `vertexaisearch...` y el
 * dominio real viene en el `title` — TASK-1233).
 */
export const normalizeDomain = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const host = value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
  const clean = host.startsWith('www.') ? host.slice(4) : host

  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(clean) ? clean : null
}

/**
 * Construye una citation normalizada. El dominio se resuelve con prioridad:
 * `domain` explícito (cuando el provider lo expone aparte del url, ej. Gemini) →
 * host del `url`. Devuelve `null` si no se puede determinar dominio (se descarta,
 * NO se inventa).
 */
export const buildCitation = (input: {
  url: string
  title?: string | null
  sourceType?: GrowthAiVisibilitySourceType
  domain?: string | null
}): GrowthAiVisibilityCitation | null => {
  const domain = normalizeDomain(input.domain) ?? extractCitationDomain(input.url)

  if (!domain) {
    return null
  }

  return {
    url: input.url,
    domain,
    ...(input.title ? { title: input.title } : {}),
    ...(input.sourceType ? { sourceType: input.sourceType } : {})
  }
}

/** Normaliza una lista de citations crudas a únicas por url (descarta sin dominio determinable). */
export const buildCitations = (
  raw: ReadonlyArray<{ url: string; title?: string | null; sourceType?: GrowthAiVisibilitySourceType; domain?: string | null }>
): GrowthAiVisibilityCitation[] => {
  const seen = new Set<string>()
  const citations: GrowthAiVisibilityCitation[] = []

  for (const item of raw) {
    if (!item?.url || seen.has(item.url)) {
      continue
    }

    const citation = buildCitation(item)

    if (citation) {
      seen.add(item.url)
      citations.push(citation)
    }
  }

  return citations
}

/**
 * Serializa una observación a un objeto plano JSON-safe (apto para fila de DB /
 * response). Round-trips con `JSON.parse(JSON.stringify(...))`. No incluye
 * secretos ni raw payload (solo `rawEvidencePointer`, un puntero a storage).
 */
export const serializeProviderObservation = (
  observation: GrowthAiVisibilityProviderObservation
): Record<string, unknown> => ({
  observationId: observation.observationId,
  runId: observation.runId,
  promptId: observation.promptId,
  provider: observation.provider,
  model: observation.model,
  status: observation.status,
  answerTextHash: observation.answerTextHash,
  answerExcerpt: observation.answerExcerpt,
  citations: observation.citations.map(citation => ({ ...citation })),
  usage: observation.usage,
  latencyMs: observation.latencyMs,
  providerRequestHash: observation.providerRequestHash,
  rawEvidencePointer: observation.rawEvidencePointer,
  errorCode: observation.errorCode,
  providerPolicyVersion: observation.providerPolicyVersion,
  promptPackVersion: observation.promptPackVersion,
  createdAt: observation.createdAt
})
