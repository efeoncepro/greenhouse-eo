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

/**
 * Brazo vector híbrido (TASK-1151, decision packet TASK-1136 — GO condicional).
 *
 * Default OFF → `searchKnowledge` es byte-equivalente al FTS+rerank (el bloque vector
 * se omite entero). ON: el vector entra como REFUERZO de recall gateado por señal del FTS
 * (solo cuando el FTS ya encontró algo → preserva el no-answer honesto; el vector nunca
 * manufactura una respuesta). Mismo SSOT, contrato `knowledge-search.v1` intacto.
 * Activación en prod = decisión del operador post-validación de thresholds (decision packet §6).
 */
export const isKnowledgeSearchHybridEnabled = (): boolean =>
  process.env.KNOWLEDGE_SEARCH_HYBRID_ENABLED === 'true'
