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

const INTERNAL_AGENT_ALLOWED = {
  approverRole: 'efeonce_admin',
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: 'functional'
} as const

/**
 * Corpus Notion autorizado (declarado por el operador 2026-06-12, teamspace Efeonce
 * vía integración "Greenhouse KNOW"). Solo conocimiento de prosa — las databases
 * operacionales (Sprints/Proyectos/Tareas/Calendarios/Revisiones) NO entran.
 * Casos de Negocio queda diferido (se sumará como entrada `page` cuando se autorice).
 */
export const NOTION_KNOWLEDGE_CORPUS: readonly NotionCorpusEntry[] = [
  // Wikis (databases) — se expanden a todos sus artículos.
  // (Wiki de IA descartada por el operador 2026-06-12: artículos no aptos para el corpus.)
  {
    kind: 'data_source',
    slugPrefix: 'wiki-sops',
    notionDataSourceId: '13239c2f-efe7-81ca-80be-000b0f2c187e',
    documentType: 'sop',
    ownerDomain: 'operations',
    ...INTERNAL_AGENT_ALLOWED
  },
  {
    kind: 'data_source',
    slugPrefix: 'wiki-contenidos',
    notionDataSourceId: '15839c2f-efe7-819d-90b7-000b9011a403',
    documentType: 'manual',
    ownerDomain: 'content',
    ...INTERNAL_AGENT_ALLOWED
  },
  {
    kind: 'data_source',
    slugPrefix: 'wiki-axis',
    notionDataSourceId: '15d39c2f-efe7-810f-b26c-000bbf5b46aa',
    documentType: 'manual',
    ownerDomain: 'design',
    ...INTERNAL_AGENT_ALLOWED
  },
  {
    kind: 'data_source',
    slugPrefix: 'inicio-empresa',
    notionDataSourceId: '1e539c2f-efe7-810f-8782-000b99505c56',
    documentType: 'manual',
    ownerDomain: 'platform',
    ...INTERNAL_AGENT_ALLOWED
  },
  {
    kind: 'data_source',
    slugPrefix: 'buyer-personas-icp',
    notionDataSourceId: '825e73f9-4b4d-4e61-b714-2fcdff9a1af6',
    documentType: 'manual',
    ownerDomain: 'commercial',
    ...INTERNAL_AGENT_ALLOWED
  },
  // Páginas sueltas.
  {
    kind: 'page',
    slug: 'onboarding',
    title: 'Onboarding',
    notionPageId: '29539c2f-efe7-8086-93f9-e0be17f30dc3',
    humanUrl: '/knowledge/onboarding',
    documentType: 'onboarding_path',
    ownerDomain: 'people',
    ...INTERNAL_AGENT_ALLOWED
  },
  {
    kind: 'page',
    slug: 'guia-automatizaciones',
    title: 'Guía de Automatizaciones — Marketing × Tareas',
    notionPageId: 'f1c2ad68-b22c-4a2a-ab5f-6e07d989d4a4',
    humanUrl: '/knowledge/guia-automatizaciones',
    documentType: 'how_to',
    ownerDomain: 'operations',
    ...INTERNAL_AGENT_ALLOWED
  }
]
