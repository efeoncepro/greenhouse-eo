/**
 * TASK-1019 Slice 3 — Workforce Contracting AI module (server-only barrel).
 *
 * Imported directly by server consumers (NOT via the pure `@/lib/workforce/contracting`
 * barrel). config + ai-run-store + draft-adapter are server-only; schema + input-packet
 * are pure but re-exported here for cohesion.
 */
export * from './config'
export * from './schema'
export * from './input-packet'
export * from './ai-run-store'
export * from './draft-adapter'
