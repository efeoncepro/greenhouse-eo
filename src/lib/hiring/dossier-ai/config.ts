import 'server-only'

// TASK-1735 — Expediente de Evaluación SMART: config del carril LLM (espejo de
// assessment/ai/config.ts). El modelo se resuelve desde env var con default; swappear el
// modelo NO cambia el contrato propose→confirm. El flag gatea SOLO el propose (costo LLM):
// el confirm/reject de propuestas existentes y las notas manuales NUNCA se gatean por el
// flag (un humano siempre puede drenar la cola aunque el feature esté apagado).

/** Flag canónico. Default OFF (registrado en FEATURE_FLAG_STATE_LEDGER.md; Vercel-only). */
export const isHiringDossierAiEnabled = (): boolean =>
  process.env.HIRING_EVALUATION_DOSSIER_AI_ENABLED === 'true'

export const HIRING_DOSSIER_PROVIDER = 'anthropic' as const

/**
 * Default = Claude Sonnet 5 (`claude-sonnet-5`). `generateStructuredAnthropic` recibe el
 * model string crudo y lo pasa al SDK. Override por env `HIRING_DOSSIER_AI_MODEL`.
 * El digest de la propuesta captura SIEMPRE el modelo efectivo resuelto, no el default.
 */
export const getHiringDossierModel = (): string =>
  process.env.HIRING_DOSSIER_AI_MODEL?.trim() || 'claude-sonnet-5'

export const HIRING_DOSSIER_PROMPT_VERSION = 'hiring_evaluation_dossier.v1'
