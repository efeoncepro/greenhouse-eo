import 'server-only'

// TASK-1735 — Expediente de Evaluación SMART: config del carril LLM (espejo de
// assessment/ai/config.ts). El modelo se resuelve desde env var con default; swappear el
// modelo NO cambia el contrato propose→confirm. El flag gatea SOLO el propose (costo LLM):
// el confirm/reject de propuestas existentes y las notas manuales NUNCA se gatean por el
// flag (un humano siempre puede drenar la cola aunque el feature esté apagado).

/** Flag canónico. Default OFF (registrado en FEATURE_FLAG_STATE_LEDGER.md; Vercel-only). */
export const isHiringDossierAiEnabled = (): boolean =>
  process.env.HIRING_EVALUATION_DOSSIER_AI_ENABLED === 'true'

/**
 * Worker-only gate. A clean, ready CV may enqueue an idempotent dossier proposal,
 * but the proposal remains operator-only and never materializes a note by itself.
 */
export const isHiringDossierAutoProposeEnabled = (): boolean =>
  process.env.HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED === 'true'

export const HIRING_DOSSIER_PROVIDER = 'anthropic' as const

/**
 * Default = Claude Sonnet 5. DECISIÓN EXPLÍCITA (2026-08-19, operador): el dossier redacta la
 * narrativa CV-vs-assessment que un humano usa para decidir sobre una persona. Mismo tier de
 * calidad que el scoring, por la misma razón.
 *
 * El modelo forma parte del digest de la propuesta, así que cambiarlo supersede las propuestas
 * activas sin mutarlas. El digest captura SIEMPRE el modelo efectivo resuelto, no el default.
 */
export const getHiringDossierModel = (): string =>
  process.env.HIRING_DOSSIER_AI_MODEL?.trim() || 'claude-sonnet-5'

/**
 * v2 (TASK-1737): el packet lleva el nombre humano de cada competencia, el prompt exige
 * nombrarlas por su nombre visible (nunca claves snake_case) y el sanitizer traduce toda
 * key eco-eada. Subir la versión cambia el digest → las propuestas v1 quedan stale por diseño.
 */
export const HIRING_DOSSIER_PROMPT_VERSION = 'hiring_evaluation_dossier.v2'
