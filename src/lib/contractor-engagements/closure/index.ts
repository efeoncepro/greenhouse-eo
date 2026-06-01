/**
 * TASK-797 — Contractor closure module barrel (PURE helpers only).
 *
 * Types + pure readiness evaluator. Safe en client + server. El store de cierre
 * es server-only y NO se re-exporta acá (mismo invariante que el barrel raíz,
 * TASK-827 bug class). Server consumers importan
 * `@/lib/contractor-engagements/closure/store` directo.
 */
export * from './types'
export * from './readiness'
