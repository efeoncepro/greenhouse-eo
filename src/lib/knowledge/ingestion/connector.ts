/**
 * TASK-1082 — Knowledge ingestion connector interface (pure, source-agnostic).
 *
 * Un connector resuelve los documentos candidatos de una fuente autorizada y
 * carga su markdown crudo + provenance. El pipeline (server-only) lo consume
 * para normalizar → sanitizar → versionar → chunkear → publicar.
 *
 * V1: connector `repo_docs` (markdown del repo). El connector `notion`
 * (block fetcher + blocks→markdown) queda DIFERIDO a TASK-1088, gated en secret.
 */

import type {
  KnowledgeAgenticPolicy,
  KnowledgeAudience,
  KnowledgeDocLayer,
  KnowledgeDocumentType,
  KnowledgeSensitivity,
  KnowledgeSourceKind,
  KnowledgeSourceSystem
} from '../types'

/**
 * Metadata de gobernanza declarada por el manifest del corpus (no se infiere
 * del contenido — es decisión editorial). El connector la propaga al pipeline.
 */
export interface KnowledgeDocCandidate {
  /** Clave estable del documento (== slug canónico). */
  slug: string
  title: string
  documentType: KnowledgeDocumentType
  ownerDomain: string
  approverRole: string | null
  audience: KnowledgeAudience
  sensitivity: KnowledgeSensitivity
  /** Compuerta de retrieval declarada (ortogonal al lifecycle). */
  agenticPolicy: KnowledgeAgenticPolicy
  docLayer: KnowledgeDocLayer | null
  /** Ruta humana canónica (Knowledge Center, TASK-1084). */
  humanUrl: string | null
  /** Localizador legible de la fuente (paths del repo, o page id Notion). */
  sourceLocator: string
}

export interface KnowledgeDocumentProvenance {
  sourceSystem: KnowledgeSourceSystem
  sourceUrl: string | null
  sourcePageId: string | null
  sourceCreatedAt: string | null
  sourceEditedAt: string | null
}

export interface KnowledgeLoadedDocument {
  candidate: KnowledgeDocCandidate
  rawMarkdown: string
  provenance: KnowledgeDocumentProvenance
}

/** Resultado de `list()`: el candidato está disponible o no (con razón honesta). */
export type KnowledgeConnectorListItem =
  | { kind: 'available'; candidate: KnowledgeDocCandidate }
  | { kind: 'unavailable'; candidate: KnowledgeDocCandidate; reason: string }

/**
 * Identidad del source que el connector representa, para registrar/lookup en
 * `greenhouse_knowledge.knowledge_sources`. El connector es dueño de su identidad
 * (SSOT) — el pipeline NO la hardcodea (TASK-1088: habilita `notion` además de `repo_docs`).
 */
export interface KnowledgeSourceDescriptor {
  sourceSystem: KnowledgeSourceSystem
  sourceKind: KnowledgeSourceKind
  /** Nombre estable del source (clave de lookup + registro). */
  name: string
  ownerDomain: string
  audience: KnowledgeAudience
}

export interface KnowledgeSourceConnector {
  readonly sourceSystem: KnowledgeSourceSystem
  /** Identidad del source (SSOT del registro/lookup en knowledge_sources). */
  readonly sourceDescriptor: KnowledgeSourceDescriptor
  /** Enumera los candidatos del corpus + disponibilidad (no lee contenido). */
  list(): Promise<KnowledgeConnectorListItem[]>
  /** Carga el markdown crudo + provenance de un candidato disponible. */
  load(candidate: KnowledgeDocCandidate): Promise<KnowledgeLoadedDocument>
}
