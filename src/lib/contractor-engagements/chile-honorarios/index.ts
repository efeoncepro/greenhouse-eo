/**
 * TASK-794 — Chile Honorarios Compliance module (Workforce/HR).
 *
 * Public barrel — PURE helpers only (policy + errors). Safe in client + server.
 *
 * `readiness.ts` is server-only (it queries person-legal-profile) and is
 * intentionally NOT re-exported here, to avoid pulling `import 'server-only'`
 * transitively into any client bundle (TASK-827 bug class). Server consumers
 * import it directly from `@/lib/contractor-engagements/chile-honorarios/readiness`.
 */
export * from './policy'
export * from './errors'
