/**
 * TASK-1083 — Knowledge Search barrel (PURE only).
 *
 * El reader `searchKnowledge` es server-only y se importa directo desde
 * `@/lib/knowledge/search/search-knowledge` (patrón TASK-827: no arrastrar
 * `server-only` a un client bundle vía el barrel).
 */

export * from './types'
export * from './mode'
export * from './golden-questions'
