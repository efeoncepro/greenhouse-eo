/**
 * TASK-1088 — Manifest del corpus Notion de knowledge (declarativo, pure).
 *
 * NACE VACÍO. El teamspace Notion de conocimiento es authoring; las páginas
 * concretas se declaran aquí (page id + metadata de gobernanza) cuando el
 * operador las autoriza — NO se descubren en vivo ni se ingiere "todo Notion".
 * Misma disciplina que el corpus piloto repo_docs: la metadata
 * (audience/sensitivity/agentic_policy/approver) es decisión editorial, no se
 * infiere del contenido.
 *
 * MVP solo interno: `audience='internal'`.
 */

import type { KnowledgeDocCandidate } from '../ingestion/connector'

export interface NotionCorpusEntry extends Omit<KnowledgeDocCandidate, 'sourceLocator'> {
  /** Page id de la página Notion raíz del documento (el árbol de bloques se ingiere). */
  notionPageId: string
}

/** Nombre estable del source Notion de knowledge (clave de lookup + registro). */
export const NOTION_KNOWLEDGE_SOURCE_NAME = 'Greenhouse Knowledge — Notion'

/**
 * Corpus Notion autorizado. Vacío en V1: el operador declara las entradas cuando
 * provisiona el token + comparte las páginas con la integración dedicada de knowledge.
 */
export const NOTION_KNOWLEDGE_CORPUS: readonly NotionCorpusEntry[] = []
