/**
 * TASK-1081 — Knowledge Platform canonical module (foundation).
 *
 * Public barrel — PURE helpers only (constants, types, state-machine, validators,
 * errors). Safe in client + server.
 *
 * The store is server-only and is intentionally NOT re-exported here to avoid
 * pulling `import 'server-only'` transitively into any client bundle (TASK-827
 * bug class). Server consumers import it directly from `@/lib/knowledge/store`.
 */
export * from './constants'
export * from './types'
export * from './errors'
export * from './state-machine'
export * from './validators'
