import 'server-only'

import { query } from '@/lib/db'

import { deriveKnowledgeChunkFreshness } from '../state-machine'
import type { KnowledgeFreshness, KnowledgePublicationStatus, KnowledgeSensitivity } from '../types'
import { isKnowledgeSearchRerankEnabled } from './flags'
import { rerankKnowledgeChunks } from './rerank-knowledge-chunks'
import {
  KNOWLEDGE_SEARCH_CONTRACT_VERSION,
  type KnowledgeRetrievalChunk,
  type KnowledgeRetrievalPacket,
  type KnowledgeSearchConfidence,
  type KnowledgeSearchSubject,
  type SearchKnowledgeInput
} from './types'

// ---------------------------------------------------------------------------
// Tunables — calibrados contra el corpus real (heading match ~0.99 vía weight A,
// body-only match más bajo). El eval harness (golden questions) valida estos
// umbrales; ajustar aquí si el recall lo pide (la columna `body_tsv` no cambia).
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const RANK_HIGH = 0.2
const RANK_MEDIUM = 0.05
// Piso de relevancia: con OR, una pregunta off-corpus matchea verbos incidentales
// ('tiene', 'preparar') con rank ~0.05-0.06; las queries reales rankean >= 0.22
// (medido contra el corpus). El piso 0.10 rechaza el ruido (no-answer honesto) sin
// tocar los matches reales. Tunable (igual que RANK_HIGH/MEDIUM); el eval harness lo valida.
const MIN_RANK_FLOOR = 0.1

// publication_status visible por modo (envelope). 'quarantined'/'draft'/'review'
// NUNCA aparecen. 'agentic' excluye 'deprecated' (solo bajo pregunta explícita, 1085).
const HUMAN_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale', 'deprecated']
const AGENTIC_STATUSES: KnowledgePublicationStatus[] = ['published', 'stale']

interface SearchRow {
  [column: string]: unknown
  chunk_id: string
  document_id: string
  document_version_id: string
  heading_path: string[] | null
  body_text: string
  citation_anchor: string
  title: string
  slug: string
  human_url: string | null
  publication_status: string
  sensitivity: string
  last_reviewed_at: Date | string | null
  source_url: string | null
  rank: number | string
}

const toIso = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : value

const audienceEnvelope = (tenantType: KnowledgeSearchSubject['tenantType']): string[] =>
  tenantType === 'client' ? ['client', 'mixed'] : ['internal', 'mixed']

const deriveConfidence = (topRank: number, resultCount: number): KnowledgeSearchConfidence => {
  if (resultCount === 0) {
    return 'none'
  }

  if (topRank >= RANK_HIGH) {
    return 'high'
  }

  if (topRank >= RANK_MEDIUM) {
    return 'medium'
  }

  return 'low'
}

// Peor freshness del set retornado (deprecated > stale > current).
const aggregateFreshness = (statuses: KnowledgePublicationStatus[]): KnowledgeFreshness => {
  if (statuses.length === 0) {
    return 'unknown'
  }

  if (statuses.includes('deprecated')) {
    return 'deprecated'
  }

  if (statuses.includes('stale')) {
    return 'stale'
  }

  if (statuses.includes('published')) {
    return 'current'
  }

  return 'unknown'
}

const buildCitationLabel = (title: string, headingPath: string[]): string =>
  headingPath.length > 0 ? `${title} › ${headingPath.join(' › ')}` : title

const buildHumanUrl = (humanUrl: string | null, slug: string, anchor: string): string =>
  humanUrl ? `${humanUrl}#${anchor}` : `/knowledge/${slug}#${anchor}`

const mapChunk = (row: SearchRow): KnowledgeRetrievalChunk => {
  const headingPath = row.heading_path ?? []
  const status = row.publication_status as KnowledgePublicationStatus

  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentVersionId: row.document_version_id,
    title: row.title,
    headingPath,
    text: row.body_text,
    sourceUrl: row.source_url,
    humanUrl: buildHumanUrl(row.human_url, row.slug, row.citation_anchor),
    citationLabel: buildCitationLabel(row.title, headingPath),
    // Score de relevancia (ts_rank) redondeado — el único número de retrieval; la UI
    // deriva de aquí la confianza por fuente/overall (Answer Trace, TASK-1089/1085).
    score: Math.round(Number(row.rank) * 10000) / 10000,
    updatedAt: toIso(row.last_reviewed_at),
    freshness: deriveKnowledgeChunkFreshness(status),
    sensitivity: row.sensitivity as KnowledgeSensitivity
  }
}

/**
 * Reader SSOT de retrieval — el ÚNICO punto que recupera chunks para búsqueda /
 * consumo agéntico (Full API Parity #2; lint rule `no-direct-knowledge-chunk-query`).
 *
 * Pre-LLM filtering en SQL (Delta B): filtra por tenant/audience/publication/policy
 * ANTES de construir el packet. El contenido de los fragmentos denegados NUNCA entra
 * al reader (los `agent_excluded`/`restricted` solo se cuentan, sin texto).
 *
 * NO swallowea errores: una falla del índice debe propagarse (la sanitiza el
 * endpoint), nunca disfrazarse de `confidence='none'` (degradación honesta).
 */
export const searchKnowledge = async (
  input: SearchKnowledgeInput
): Promise<KnowledgeRetrievalPacket> => {
  const { subject, mode } = input
  const generatedAt = new Date().toISOString()
  const trimmedQuery = input.query.trim()
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)

  const accessScope = {
    tenantType: subject.tenantType,
    tenantId: subject.tenantId,
    userId: subject.userId,
    roleCodes: subject.roleCodes,
    routeGroups: subject.routeGroups,
    capabilities: subject.capabilities
  }

  const basePacket = (
    overrides: Partial<KnowledgeRetrievalPacket>
  ): KnowledgeRetrievalPacket => ({
    contractVersion: KNOWLEDGE_SEARCH_CONTRACT_VERSION,
    query: trimmedQuery,
    generatedAt,
    mode,
    accessScope,
    confidence: 'none',
    freshness: 'unknown',
    chunks: [],
    deniedOrFilteredCount: 0,
    notes: [],
    ...overrides
  })

  if (!trimmedQuery) {
    return basePacket({ notes: ['Consulta vacía; ingresá una pregunta.'] })
  }

  const statuses = mode === 'agentic' ? AGENTIC_STATUSES : HUMAN_STATUSES
  const audiences = audienceEnvelope(subject.tenantType)

  const agenticPolicyClause =
    mode === 'agentic' ? `AND kd.agentic_policy = 'agent_allowed' AND kd.sensitivity = 'internal'` : ''

  // tsquery: unaccent (accent-insensitive) + OR-ify (replace ' & ' -> ' | '). Las
  // preguntas naturales traen verbos/ruido que no están en el chunk; con AND (default
  // de websearch) ningún chunk tiene TODOS los términos -> recall pobre. Con OR cualquier
  // término matchea y ts_rank ordena por relevancia (heading weight A premia el match
  // del encabezado). El no-answer honesto sigue siendo 0 resultados cuando ningún
  // término del corpus aparece. Substrato vector = escalación diferida (TASK-1080).
  const rows = await query<SearchRow>(
    `SELECT kc.chunk_id, kc.document_id, kc.document_version_id, kc.heading_path,
            kc.body_text, kc.citation_anchor,
            kd.title, kd.slug, kd.human_url, kd.publication_status, kd.sensitivity,
            kd.last_reviewed_at, kdv.source_url,
            ts_rank(kc.body_tsv, q.tsq) AS rank
     FROM greenhouse_knowledge.knowledge_chunks kc
     JOIN greenhouse_knowledge.knowledge_documents kd ON kd.document_id = kc.document_id
     JOIN greenhouse_knowledge.knowledge_document_versions kdv ON kdv.version_id = kc.document_version_id
     CROSS JOIN (SELECT replace(websearch_to_tsquery('spanish', unaccent($1))::text, ' & ', ' | ')::tsquery AS tsq) q
     WHERE kc.body_tsv @@ q.tsq
       AND ts_rank(kc.body_tsv, q.tsq) >= $4
       AND kc.document_version_id = kd.current_version_id
       AND kd.publication_status = ANY($2::text[])
       AND kd.audience = ANY($3::text[])
       ${agenticPolicyClause}
     ORDER BY rank DESC
     LIMIT $5`,
    [trimmedQuery, statuses, audiences, MIN_RANK_FLOOR, limit]
  )

  // Conteo de fragmentos que matchearon dentro del envelope pero quedaron fuera por
  // política agéntica (agent_excluded / restricted). Solo COUNT — el contenido nunca
  // se trae. Para `human` (interno) no hay policy gate => 0.
  let deniedOrFilteredCount = 0

  if (mode === 'agentic') {
    const deniedRows = await query<{ n: number | string; [column: string]: unknown }>(
      `SELECT COUNT(*) AS n
       FROM greenhouse_knowledge.knowledge_chunks kc
       JOIN greenhouse_knowledge.knowledge_documents kd ON kd.document_id = kc.document_id
       CROSS JOIN (SELECT replace(websearch_to_tsquery('spanish', unaccent($1))::text, ' & ', ' | ')::tsquery AS tsq) q
       WHERE kc.body_tsv @@ q.tsq
         AND ts_rank(kc.body_tsv, q.tsq) >= $4
         AND kc.document_version_id = kd.current_version_id
         AND kd.publication_status = ANY($2::text[])
         AND kd.audience = ANY($3::text[])
         AND (kd.agentic_policy = 'agent_excluded' OR kd.sensitivity = 'restricted')`,
      [trimmedQuery, AGENTIC_STATUSES, audiences, MIN_RANK_FLOOR]
    )

    deniedOrFilteredCount = Number(deniedRows[0]?.n ?? 0)
  }

  const chunks = rows.map(mapChunk)
  const topRank = rows.length > 0 ? Number(rows[0].rank) : 0
  const confidence = deriveConfidence(topRank, chunks.length)

  const freshness = aggregateFreshness(
    rows.map(row => row.publication_status as KnowledgePublicationStatus)
  )

  const notes: string[] = []

  if (chunks.length === 0) {
    notes.push('No se encontró una guía publicada para esta consulta.')
  }

  if (deniedOrFilteredCount > 0) {
    notes.push(
      `${deniedOrFilteredCount} fragmento(s) coinciden pero quedaron fuera por política de acceso.`
    )
  }

  if (freshness === 'stale') {
    notes.push('Algunas fuentes están marcadas como desactualizadas.')
  } else if (freshness === 'deprecated') {
    notes.push('Algunas fuentes están marcadas como obsoletas.')
  }

  // TASK-1124 — rerank conservador del top-N ya recuperado (mismo set; solo cambia el
  // orden → confidence/freshness/deniedCount intactos). Default OFF = orden FTS puro.
  const orderedChunks = isKnowledgeSearchRerankEnabled() ? rerankKnowledgeChunks(chunks, trimmedQuery) : chunks

  return basePacket({ confidence, freshness, chunks: orderedChunks, deniedOrFilteredCount, notes })
}
