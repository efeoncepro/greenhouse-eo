/**
 * TASK-1235 — Growth AI Visibility · Report barrel.
 *
 * `command.ts` es server-only (lo importa el endpoint admin, no el barrel) para
 * que `contracts`/`recommendations`/`builder` (puros) se puedan importar en
 * tests y en el cliente sin arrastrar `server-only`.
 */

export * from './contracts'
export * from './recommendations'
export * from './builder'
