/**
 * TASK-790 — Contractor Engagements canonical module (Workforce/HR).
 *
 * Public barrel — PURE helpers only (types, state-machine, subtype-consistency,
 * classification-risk, tax-policy, errors). Safe in client + server.
 *
 * The store is server-only and is intentionally NOT re-exported here to avoid
 * pulling `import 'server-only'` transitively into any client bundle (TASK-827
 * bug class). Server consumers import it directly from
 * `@/lib/contractor-engagements/store`.
 */
export * from './types'
export * from './errors'
export * from './state-machine'
export * from './subtype-consistency'
export * from './classification-risk'
export * from './tax-policy'
// TASK-797 — closure pure helpers (types + readiness evaluator). The closure STORE
// is server-only and imported directly from './closure/store' (TASK-827 bug class).
export * from './closure'
