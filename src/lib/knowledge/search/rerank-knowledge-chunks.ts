import type { KnowledgeRetrievalChunk } from './types'

/**
 * Rerank conservador y aditivo sobre el top-N ya recuperado por FTS (TASK-1124).
 *
 * NO ensancha el pool de candidatos ni reemplaza el FTS: reordena el MISMO conjunto
 * de chunks que `ts_rank` ya seleccionó, mezclando el rank FTS (señal dominante) con:
 *  - match de encabezado (la SECCIÓN del chunk matchea la pregunta) → anti wrong-source:
 *    un chunk con heading específico gana a uno con heading genérico ("Introducción")
 *    que matcheó solo por ruido del cuerpo.
 *  - freshness (penaliza stale/deprecated, premia current levemente).
 *  - diversidad por documento (un solo documento no monopoliza el tope → el modelo
 *    recibe evidencia cruzada).
 *
 * Determinista (input fijo → output fijo). NO muta `chunk.score` (sigue siendo el
 * ts_rank, único número de retrieval que la UI muestra). Como el conjunto no cambia,
 * `confidence`/`freshness`/`deniedOrFilteredCount` del packet quedan idénticos; lo
 * único que cambia es el orden (y por ende el mapeo [n] → mejor evidencia primero).
 */

const HEADING_MATCH_WEIGHT = 0.5
const DIVERSITY_DECAY = 0.85
const MIN_TERM_LENGTH = 3

const FRESHNESS_ADJUSTMENT: Record<KnowledgeRetrievalChunk['freshness'], number> = {
  current: 0.05,
  stale: -0.15,
  deprecated: -0.3,
  unknown: 0
}

const deaccentLower = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const queryTerms = (query: string): string[] => {
  const unique = new Set(
    deaccentLower(query)
      .split(/[^a-z0-9]+/)
      .filter(term => term.length >= MIN_TERM_LENGTH)
  )

  return [...unique]
}

const headingCoverage = (terms: string[], headingPath: string[]): number => {
  if (terms.length === 0 || headingPath.length === 0) {
    return 0
  }

  const headingText = deaccentLower(headingPath.join(' '))
  const matched = terms.filter(term => headingText.includes(term)).length

  return matched / terms.length
}

export const rerankKnowledgeChunks = (
  chunks: KnowledgeRetrievalChunk[],
  query: string
): KnowledgeRetrievalChunk[] => {
  if (chunks.length <= 1) {
    return chunks
  }

  const terms = queryTerms(query)

  // 1. Score preliminar: FTS dominante × (heading boost + ajuste de freshness).
  const preliminary = chunks.map((chunk, originalIndex) => {
    const headingBoost = HEADING_MATCH_WEIGHT * headingCoverage(terms, chunk.headingPath)
    const freshnessAdj = FRESHNESS_ADJUSTMENT[chunk.freshness] ?? 0
    const score = chunk.score * (1 + headingBoost + freshnessAdj)

    return { chunk, originalIndex, score }
  })

  // 2. Orden estable por score preliminar (desempate = orden FTS original).
  preliminary.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)

  // 3. Pasada de diversidad: el 3er+ chunk del mismo documento decae geométricamente
  //    para que el modelo reciba evidencia de varios documentos cuando exista.
  const seenByDocument = new Map<string, number>()

  const diversified = preliminary.map(entry => {
    const seen = seenByDocument.get(entry.chunk.documentId) ?? 0

    seenByDocument.set(entry.chunk.documentId, seen + 1)

    return { ...entry, score: entry.score * DIVERSITY_DECAY ** seen }
  })

  // 4. Orden final estable (desempate = orden FTS original).
  diversified.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)

  return diversified.map(entry => entry.chunk)
}
