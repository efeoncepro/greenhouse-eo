import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  buildChunkEmbedText,
  embedKnowledgeDocumentTexts,
  embedTextChecksum,
  KNOWLEDGE_EMBED_MODEL,
  toPgVectorLiteral
} from './knowledge-embeddings'

/**
 * TASK-1151 — paso de ingesta de embeddings del corpus (idempotente por checksum).
 *
 * Embebe los chunks de la versión vigente de cada documento (los únicos que
 * `searchKnowledge` puede retornar) y persiste el vector en `knowledge_chunks.embedding`.
 * Idempotente: re-correr solo re-embebe los chunks cuyo texto cambió (`embedding_checksum`)
 * o que aún no tienen embedding. NO corre en el request path; es un paso de ingesta
 * (CLI `scripts/knowledge/embed-corpus.ts` o, a futuro, reactivo al publicar un doc).
 */

interface ChunkToEmbedRow {
  [column: string]: unknown
  chunk_id: string
  title: string
  heading_path: string[] | null
  body_text: string
  embedding_checksum: string | null
  has_embedding: boolean
}

export interface EmbedCorpusResult {
  scanned: number
  embedded: number
  skippedUpToDate: number
  batches: number
  tokensEstimated: number
  model: string
  apply: boolean
}

const BATCH = 50

/**
 * @param apply false (default) = dry-run: NO escribe, solo reporta cuántos se embeberían.
 * @param refresh true = re-embebe todo aunque el checksum coincida.
 */
export const embedKnowledgeCorpus = async (options?: {
  apply?: boolean
  refresh?: boolean
}): Promise<EmbedCorpusResult> => {
  const apply = options?.apply ?? false
  const refresh = options?.refresh ?? false

  // Solo chunks de la versión vigente — los únicos que el retrieval puede devolver.
  const rows = await query<ChunkToEmbedRow>(
    `SELECT kc.chunk_id, kd.title, kc.heading_path, kc.body_text,
            kc.embedding_checksum,
            (kc.embedding IS NOT NULL) AS has_embedding
     FROM greenhouse_knowledge.knowledge_chunks kc
     JOIN greenhouse_knowledge.knowledge_documents kd ON kd.document_id = kc.document_id
     WHERE kc.document_version_id = kd.current_version_id
     ORDER BY kc.document_id, kc.chunk_index`
  )

  const pending: { chunkId: string; embedText: string; checksum: string }[] = []
  let skippedUpToDate = 0

  for (const row of rows) {
    const embedText = buildChunkEmbedText(row.title, row.heading_path ?? [], row.body_text)
    const checksum = embedTextChecksum(embedText)
    const upToDate = !refresh && row.has_embedding && row.embedding_checksum === checksum

    if (upToDate) {
      skippedUpToDate += 1
      continue
    }

    pending.push({ chunkId: row.chunk_id, embedText, checksum })
  }

  let embedded = 0
  let batches = 0
  let tokensEstimated = 0

  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH)

    tokensEstimated += slice.reduce((acc, p) => acc + Math.ceil(p.embedText.length / 4), 0)

    if (!apply) {
      continue
    }

    batches += 1

    try {
      const vectors = await embedKnowledgeDocumentTexts(slice.map(p => p.embedText))

      for (let j = 0; j < slice.length; j += 1) {
        const vector = vectors[j]

        if (!vector || vector.length === 0) {
          continue
        }

        await query(
          `UPDATE greenhouse_knowledge.knowledge_chunks
           SET embedding = $1::vector,
               embedding_model = $2,
               embedding_checksum = $3,
               embedding_updated_at = NOW()
           WHERE chunk_id = $4`,
          [toPgVectorLiteral(vector), KNOWLEDGE_EMBED_MODEL, slice[j].checksum, slice[j].chunkId]
        )
        embedded += 1
      }
    } catch (err) {
      captureWithDomain(err, 'knowledge', {
        tags: { source: 'embed_corpus', stage: 'embed_batch' },
        extra: { batchStart: i, batchSize: slice.length }
      })
      throw err
    }
  }

  return {
    scanned: rows.length,
    embedded: apply ? embedded : pending.length,
    skippedUpToDate,
    batches,
    tokensEstimated,
    model: KNOWLEDGE_EMBED_MODEL,
    apply
  }
}
