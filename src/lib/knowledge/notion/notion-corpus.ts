/**
 * TASK-1088 — Manifest del corpus Notion de knowledge (declarativo, pure).
 *
 * NACE VACÍO. El teamspace Notion de conocimiento es authoring; las entradas
 * concretas se declaran aquí cuando el operador las autoriza — NO se descubren en
 * vivo ni se ingiere "todo Notion". Misma disciplina que el corpus piloto repo_docs:
 * la metadata de gobernanza (audience/sensitivity/agentic_policy/approver) es
 * decisión editorial, no se infiere del contenido.
 *
 * Dos tipos de entrada:
 *  - `page`        — una página de prosa suelta = un documento.
 *  - `data_source` — una Wiki (database Notion) = se expande a N artículos (filas),
 *                    cada uno un documento, heredando la gobernanza de la Wiki.
 *
 * MVP solo interno: `audience='internal'`.
 */

import type {
  KnowledgeAgenticPolicy,
  KnowledgeAudience,
  KnowledgeDocLayer,
  KnowledgeDocumentType,
  KnowledgeSensitivity
} from '../types'

/** Gobernanza editorial compartida por cualquier entrada (declarada, no inferida). */
export interface NotionCorpusGovernance {
  documentType: KnowledgeDocumentType
  ownerDomain: string
  approverRole: string | null
  audience: KnowledgeAudience
  sensitivity: KnowledgeSensitivity
  agenticPolicy: KnowledgeAgenticPolicy
  docLayer: KnowledgeDocLayer | null
}

/** Página de prosa suelta: un documento con slug/title declarados. */
export interface NotionPageCorpusEntry extends NotionCorpusGovernance {
  kind?: 'page'
  slug: string
  title: string
  humanUrl: string | null
  notionPageId: string
}

/**
 * Wiki (data_source/database): se expande en `list()` a N artículos. El slug y el
 * human URL de cada artículo derivan del `slugPrefix` + el page id estable
 * (`${slugPrefix}/<pageId>`) — NUNCA del título (el título cambia → doc huérfano).
 * El título visible viene de la fila. La gobernanza se hereda de esta entrada.
 */
export interface NotionDataSourceCorpusEntry extends NotionCorpusGovernance {
  kind: 'data_source'
  slugPrefix: string
  notionDataSourceId: string
}

export type NotionCorpusEntry = NotionPageCorpusEntry | NotionDataSourceCorpusEntry

/** Nombre estable del source Notion de knowledge (clave de lookup + registro). */
export const NOTION_KNOWLEDGE_SOURCE_NAME = 'Greenhouse Knowledge — Notion'

/**
 * Corpus Notion autorizado. Vacío en V1: el operador declara las entradas cuando
 * provisiona el token + comparte las páginas/Wikis con la integración dedicada.
 */
export const NOTION_KNOWLEDGE_CORPUS: readonly NotionCorpusEntry[] = []
