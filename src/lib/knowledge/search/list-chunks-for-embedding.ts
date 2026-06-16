import 'server-only'

import { query } from '@/lib/db'

import { deriveKnowledgeChunkFreshness } from '../state-machine'
import type { KnowledgeFreshness, KnowledgePublicationStatus, KnowledgeSensitivity } from '../types'
import type { KnowledgeSearchMode, KnowledgeSearchSubject } from './types'

/**
 * TASK-1136 — read del corpus para la evaluación de retrieval híbrido (offline).
 *
 * Devuelve los chunks dentro del MISMO envelope pre-LLM que aplica `searchKnowledge`
 * (tenant/audience/publication_status/agentic_policy/sensitivity + current version),
 * para que el brazo vector del shadow eval compare apples-to-apples contra el FTS SSOT.
 *
 * Vive en `src/lib/knowledge/**` (capa de datos canónica, exenta de la lint rule
 * `no-direct-knowledge-chunk-query`). NO es runtime: lo consume solo el script de
 * evaluación `scripts/knowledge/hybrid-shadow-eval.ts`. NO trae contenido denegado por
 * política (mismo principio que el reader SSOT: lo filtrado nunca se materializa).
 *
 * Importante: NO es un reader paralelo de retrieval. No rankea, no arma packet, no
 * cruza el contrato `knowledge-search.v1`. Solo enumera el corpus elegible para indexar.
 */

const HUMAN_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale', 'deprecated']
const AGENTIC_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale']

export interface KnowledgeCorpusChunk {
  chunkId: string
  documentId: string
  documentVersionId: string
  title: string
  headingPath: string[]
  bodyText: string
  citationAnchor: string
  publicationStatus: KnowledgePublicationStatus
  freshness: KnowledgeFreshness
  sensitivity: KnowledgeSensitivity
}

interface CorpusRow {
  [column: string]: unknown
  chunk_id: string
  document_id: string
  document_version_id: string
  title: string
  heading_path: string[] | null
  body_text: string
  citation_anchor: string
  publication_status: string
  sensitivity: string
}

const audienceEnvelope = (tenantType: KnowledgeSearchSubject['tenantType']): string[] =>
  tenantType === 'client' ? ['client', 'mixed'] : ['internal', 'mixed']

export interface ListChunksForEmbeddingInput {
  mode: KnowledgeSearchMode
  tenantType: KnowledgeSearchSubject['tenantType']
}

/**
 * Enumera el corpus elegible para indexar bajo el envelope del `mode`/`tenantType`.
 * En modo `agentic` excluye `agent_excluded`/`restricted` (igual que el SSOT).
 */
export const listKnowledgeChunksForEmbedding = async (
  input: ListChunksForEmbeddingInput
): Promise<KnowledgeCorpusChunk[]> => {
  const statuses = input.mode === 'agentic' ? AGENTIC_STATUSES : HUMAN_STATUSES
  const audiences = audienceEnvelope(input.tenantType)

  const agenticPolicyClause =
    input.mode === 'agentic'
      ? `AND kd.agentic_policy = 'agent_allowed' AND kd.sensitivity = 'internal'`
      : ''

  const rows = await query<CorpusRow>(
    `SELECT kc.chunk_id, kc.document_id, kc.document_version_id, kc.heading_path,
            kc.body_text, kc.citation_anchor,
            kd.title, kd.publication_status, kd.sensitivity
     FROM greenhouse_knowledge.knowledge_chunks kc
     JOIN greenhouse_knowledge.knowledge_documents kd ON kd.document_id = kc.document_id
     WHERE kc.document_version_id = kd.current_version_id
       AND kd.publication_status = ANY($1::text[])
       AND kd.audience = ANY($2::text[])
       ${agenticPolicyClause}
     ORDER BY kc.document_id, kc.chunk_index`,
    [statuses, audiences]
  )

  return rows.map(row => {
    const status = row.publication_status as KnowledgePublicationStatus

    return {
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentVersionId: row.document_version_id,
      title: row.title,
      headingPath: row.heading_path ?? [],
      bodyText: row.body_text,
      citationAnchor: row.citation_anchor,
      publicationStatus: status,
      freshness: deriveKnowledgeChunkFreshness(status),
      sensitivity: row.sensitivity as KnowledgeSensitivity
    }
  })
}
