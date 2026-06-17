/**
 * TASK-1136/1151 — fusión de rankings (pura, cero deps).
 *
 * Vive separado de `retrieval-eval.ts` (que importa las golden questions, fixtures de
 * evaluación) para que el SSOT de runtime `searchKnowledge` pueda importar la fusión SIN
 * arrastrar el set de evaluación al bundle de producción. `retrieval-eval.ts` lo re-exporta.
 *
 * Decisión de fusión = RRF (Reciprocal Rank Fusion): fusiona por POSICIÓN, no por magnitud
 * → no requiere normalizar escalas heterogéneas (`ts_rank` FTS vs cosine vector).
 */

/** Cosine similarity. Asume vectores de igual dimensión; 0 si difieren o están vacíos. */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length === 0) {
    return 0
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export const RRF_K = 60

/**
 * Reciprocal Rank Fusion. Cada lista es un ranking ordenado de ids (mejor primero).
 * Score(id) = Σ_listas weight_i / (k + rank_1based). Devuelve ids ordenados por score desc.
 * Determinista: empate se rompe por el orden de primera aparición.
 *
 * `weights` (opcional, default 1 por lista): favorece una lista sobre otra. En el híbrido
 * Greenhouse el FTS pesa más que el vector (TASK-1151) — el FTS ya es 100% en el golden;
 * el peso preserva sus top hits (no los demota un vecino vector) mientras el vector
 * sigue aportando recall en los slots de cola (paráfrasis).
 */
export const rrfFuse = (lists: string[][], k: number = RRF_K, weights?: number[]): string[] => {
  const score = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  let seq = 0

  lists.forEach((list, listIdx) => {
    const weight = weights?.[listIdx] ?? 1

    list.forEach((id, idx) => {
      score.set(id, (score.get(id) ?? 0) + weight / (k + idx + 1))

      if (!firstSeen.has(id)) {
        firstSeen.set(id, seq)
        seq += 1
      }
    })
  })

  return [...score.keys()].sort(
    (a, b) => (score.get(b)! - score.get(a)!) || (firstSeen.get(a)! - firstSeen.get(b)!)
  )
}

export interface FtsRankedItem {
  id: string
  /** ts_rank del FTS (mayor = match léxico más fuerte). */
  score: number
}

/**
 * TASK-1151 — fusión híbrida en DOS NIVELES (resuelve la tensión paráfrasis vs golden).
 *
 * Un peso RRF único no puede tener ambas: proteger los top hits del FTS (golden) cuesta el
 * recall de paráfrasis, y capturar la paráfrasis (equal-weight) demota un hit fuerte del FTS.
 * La causa es que un peso lineal no distingue un hit FUERTE del FTS de uno incidental DÉBIL.
 *
 * Solución: dos niveles por CALIDAD del match léxico.
 *  - Tier 1 (protegido): los chunks FTS con `score >= strongFtsRank` se mantienen SIEMPRE, en
 *    su orden FTS. Son los matches léxicos fuertes (la respuesta golden es uno de estos) →
 *    el vector nunca los demota → cero regresión golden.
 *  - Tier 2 (competido): los chunks FTS DÉBILES (incidental) + los vector-only compiten por los
 *    slots restantes vía RRF equal-weight → un vector-only de alta relevancia le gana a un FTS
 *    incidental (recupera la paráfrasis) sin tocar el Tier 1.
 *
 * Pura y determinista. `vectorOrderedIds` viene ya ordenado por cosine desc.
 */
export const hybridFuse = (
  fts: FtsRankedItem[],
  vectorOrderedIds: string[],
  opts: { strongFtsRank: number; limit: number }
): string[] => {
  const ftsIds = new Set(fts.map(f => f.id))
  const strong = fts.filter(f => f.score >= opts.strongFtsRank).map(f => f.id)
  const weak = fts.filter(f => f.score < opts.strongFtsRank).map(f => f.id)
  const vectorOnly = vectorOrderedIds.filter(id => !ftsIds.has(id))
  const tier2 = rrfFuse([weak, vectorOnly])

  const ordered: string[] = []
  const seen = new Set<string>()

  for (const id of [...strong, ...tier2]) {
    if (!seen.has(id)) {
      seen.add(id)
      ordered.push(id)
    }
  }

  return ordered.slice(0, opts.limit)
}
