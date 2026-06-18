import 'server-only'

/**
 * TASK-1155 — embedding reactivo post-publicación.
 *
 * Default ON porque no cambia el contrato de retrieval ni la personalidad de Nexa:
 * solo materializa embeddings para chunks nuevos fuera del request path. El valor
 * `false` funciona como kill-switch operativo si Vertex/quotas degradan la ingesta.
 */
export const isKnowledgeReactiveEmbeddingEnabled = (): boolean =>
  process.env.KNOWLEDGE_REACTIVE_EMBEDDING_ENABLED !== 'false'
