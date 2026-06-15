/**
 * Flags de la capa de búsqueda de knowledge (TASK-1124).
 *
 * Patrón canónico Greenhouse `process.env.X === 'true'` (sin drift, default OFF).
 * El rerank reordena el top-N ya recuperado por FTS (mismo set; solo cambia el orden)
 * → con el flag OFF el packet es byte-equivalente al retrieval FTS puro. Es un flag de
 * capa de búsqueda (afecta a TODOS los consumers del SSOT: Nexa, MCP, UI), no Nexa-only.
 */
export const isKnowledgeSearchRerankEnabled = (): boolean =>
  process.env.KNOWLEDGE_SEARCH_RERANK_ENABLED === 'true'
