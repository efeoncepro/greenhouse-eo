/**
 * TASK-1019 — Workforce Contracting Studio canonical module (Workforce/HR).
 *
 * Public barrel — PURE helpers only (types, state-machine, error). Safe in client + server.
 *
 * The store is server-only and is intentionally NOT re-exported here to avoid pulling
 * `import 'server-only'` transitively into any client bundle (TASK-827 bug class).
 * Server consumers import it directly from `@/lib/workforce/contracting/store` and
 * `@/lib/workforce/contracting/commands`.
 */
export * from './types'
export * from './state-machine'
export * from './projection'
export * from './jurisdiction-packs'
