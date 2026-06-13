/**
 * TASK-1083 — Knowledge Search contract types (pure, client + server safe).
 *
 * `KnowledgeRetrievalPacket` es el contrato versionado que consumen por igual la
 * UI humana (TASK-1084), Nexa (TASK-1085) y el MCP (TASK-1086). Full API Parity:
 * un solo reader SSOT (`searchKnowledge`), un solo shape estable.
 */

import type { KnowledgeFreshness, KnowledgeSensitivity } from '../types'

/** Bump a `knowledge-search.v2` ante cualquier cambio breaking del shape. */
export const KNOWLEDGE_SEARCH_CONTRACT_VERSION = 'knowledge-search.v1' as const

export type KnowledgeSearchContractVersion = typeof KNOWLEDGE_SEARCH_CONTRACT_VERSION

/**
 * Dos modos de filtrado pre-LLM (Delta B). `human` ve `agent_excluded`; `agentic`
 * NUNCA retorna `agent_excluded`/`quarantined`/`restricted`.
 */
export type KnowledgeSearchMode = 'human' | 'agentic'

export type KnowledgeSearchConfidence = 'high' | 'medium' | 'low' | 'none'

/**
 * Subject lane-agnóstico (Full API Parity #4): el reader recibe esto, no el
 * `request`. El endpoint `app` lo construye desde `TenantContext`; el lane
 * `ecosystem`/MCP (TASK-1086) lo construye desde su propio principal — mismo reader.
 */
export interface KnowledgeSearchSubject {
  userId: string
  tenantType: 'client' | 'efeonce_internal'
  /** clientId del tenant, o null para internos. */
  tenantId: string | null
  roleCodes: string[]
  routeGroups: string[]
  /** Capabilities `knowledge.*` que el subject posee (informativo en accessScope). */
  capabilities: string[]
}

export interface SearchKnowledgeInput {
  query: string
  subject: KnowledgeSearchSubject
  mode: KnowledgeSearchMode
  /** Tope de chunks en el packet (default 8, clamp 1..20). */
  limit?: number
}

export interface KnowledgeRetrievalChunk {
  chunkId: string
  documentId: string
  documentVersionId: string
  title: string
  headingPath: string[]
  text: string
  /** URL de la fuente externa (Notion). Null para corpus repo / sin acceso. */
  sourceUrl: string | null
  /** Surface Greenhouse canónica de lectura humana. */
  humanUrl: string
  citationLabel: string
  /**
   * Score de relevancia (`ts_rank` redondeado) — SSOT del número del trace. La
   * confianza por fuente/overall que muestre la UI se DERIVA de aquí (agregando por
   * documento o tomando el máximo), nunca se inventa un número paralelo.
   */
  score: number
  updatedAt: string | null
  freshness: KnowledgeFreshness
  sensitivity: KnowledgeSensitivity
}

export interface KnowledgeRetrievalAccessScope {
  tenantType: string
  tenantId: string | null
  userId: string
  roleCodes: string[]
  routeGroups: string[]
  capabilities: string[]
}

export interface KnowledgeRetrievalPacket {
  contractVersion: KnowledgeSearchContractVersion
  query: string
  generatedAt: string
  mode: KnowledgeSearchMode
  accessScope: KnowledgeRetrievalAccessScope
  confidence: KnowledgeSearchConfidence
  freshness: KnowledgeFreshness
  chunks: KnowledgeRetrievalChunk[]
  /** Fragmentos que matchearon pero quedaron fuera por política. Sin contenido. */
  deniedOrFilteredCount: number
  notes: string[]
}
