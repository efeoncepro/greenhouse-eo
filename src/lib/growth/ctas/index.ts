/**
 * TASK-1339 — Growth CTA & Popup Engine: primitive canónico `growth.cta`.
 * Un primitive, muchos consumers (Full API Parity): API pública/admin, renderer
 * (TASK-1340), admin cockpit futuro, Nexa/MCP y CLI consumen SOLO estos exports.
 */
export * from './contracts'
export * from './flags'
export * from './arbiter'
export * from './action-registry'
export * from './action-router'
export * from './render-contract'
export * from './ingest'
export * from './commands'
export * from './readers'
export * from './suppression'
export * from './visitor-state'
export * from './exposure'
export * from './kill-switch'
