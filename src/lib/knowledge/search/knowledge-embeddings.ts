import 'server-only'

import { createHash } from 'node:crypto'

import { getGoogleGenAIClient } from '@/lib/ai/google-genai'

/**
 * TASK-1151 — embeddings canónicos del corpus Knowledge (Vertex).
 *
 * Mismo stack/IAM/region/project que Nexa (decision packet TASK-1136 §7: mismo privacy
 * posture; el corpus es `internal`, no sale a un proveedor nuevo). NUNCA instanciar otro
 * SDK ni usar otro proveedor sin decisión de privacidad separada.
 *
 * El embedding de un chunk se computa sobre `título + headingPath + body` (la SECCIÓN da
 * contexto al vector). Es server-only: lo consumen el paso de ingesta (`embed-corpus.ts`)
 * y el brazo vector gateado de `searchKnowledge`. NUNCA en el request path como generación
 * de embeddings del corpus (eso es ingesta); el query embedding del runtime sí es por turno.
 */

export const KNOWLEDGE_EMBED_MODEL = 'text-multilingual-embedding-002'
export const KNOWLEDGE_EMBED_DIMS = 768

/** Texto canónico que se embebe por chunk (título + sección + cuerpo). */
export const buildChunkEmbedText = (title: string, headingPath: string[], bodyText: string): string =>
  (headingPath.length > 0 ? `${title} > ${headingPath.join(' > ')}\n` : `${title}\n`) + bodyText

/** Checksum del texto embebido — idempotencia: re-embeber solo si cambia. */
export const embedTextChecksum = (embedText: string): string =>
  createHash('sha256').update(embedText).digest('hex').slice(0, 16)

/** Serializa un vector JS al literal de pgvector (`[0.1,0.2,…]`) para castear `::vector`. */
export const toPgVectorLiteral = (values: number[]): string => `[${values.join(',')}]`

type GenAIClient = Awaited<ReturnType<typeof getGoogleGenAIClient>>

const embedBatch = async (
  client: GenAIClient,
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
): Promise<number[][]> => {
  const response = await client.models.embedContent({
    model: KNOWLEDGE_EMBED_MODEL,
    contents: texts,
    config: { taskType, outputDimensionality: KNOWLEDGE_EMBED_DIMS }
  })

  return (response.embeddings ?? []).map(e => e.values ?? [])
}

/** Embebe N textos de documento (batch). Devuelve un vector por texto en orden. */
export const embedKnowledgeDocumentTexts = async (texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) {
    return []
  }

  const client = await getGoogleGenAIClient()

  return embedBatch(client, texts, 'RETRIEVAL_DOCUMENT')
}

// Cache in-process de query-embeddings (el embedding de la query es un round-trip Vertex
// ~600ms; el corpus es chico y las preguntas se repiten). LRU simple por orden de inserción.
const QUERY_EMBED_CACHE_MAX = 500
const queryEmbeddingCache = new Map<string, number[]>()

/** Embebe una pregunta del runtime (taskType RETRIEVAL_QUERY), cacheada por query normalizada. */
export const embedKnowledgeQuery = async (query: string): Promise<number[]> => {
  const key = query.trim().toLowerCase()
  const cached = queryEmbeddingCache.get(key)

  if (cached) {
    return cached
  }

  const client = await getGoogleGenAIClient()
  const [vector] = await embedBatch(client, [query], 'RETRIEVAL_QUERY')
  const result = vector ?? []

  if (result.length > 0) {
    if (queryEmbeddingCache.size >= QUERY_EMBED_CACHE_MAX) {
      const oldest = queryEmbeddingCache.keys().next().value

      if (oldest !== undefined) {
        queryEmbeddingCache.delete(oldest)
      }
    }

    queryEmbeddingCache.set(key, result)
  }

  return result
}
