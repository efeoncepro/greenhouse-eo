/**
 * TASK-1229 — Growth Forms engine: barrel canónico.
 *
 * Punto de entrada único del motor. Consumers (public/admin APIs, Nexa/MCP, CLI)
 * importan de acá; un primitive, muchos consumers (Full API Parity).
 */
export * from './contracts'
export * from './policy-compiler'
export * from './commands'
export * from './readers'
export { dispatchPendingSubmissions, runFakeDestinationAdapter } from './dispatch'
