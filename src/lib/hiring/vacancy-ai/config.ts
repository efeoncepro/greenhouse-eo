import 'server-only'

// TASK-1385 — Vacancy AI (copy público de vacantes) config. Seam de provider/modelo (espejo de
// assessment/ai/config.ts): el modelo se resuelve desde env var con default; swappear el modelo
// NO cambia el contrato propose→confirm. El flag gatea SOLO el propose path — el confirm/reject
// de propuestas existentes NO se gatea (un humano siempre puede drenar la cola apagado el feature).
//
// Flag HERMANO de HIRING_ASSESSMENT_AI_ENABLED, deliberadamente separado: el flip prod del
// assessment AI está gateado por sign-off HR/Legal (scoring de candidatos = alto riesgo EU AI Act);
// el copy de vacante no decide sobre personas y no debe heredar ese bloqueo regulatorio.

/** Flag canónico. Default OFF (Runtime Rollout Completion Gate + fila en FEATURE_FLAG_STATE_LEDGER). */
export const isHiringVacancyAiEnabled = (): boolean =>
  process.env.HIRING_VACANCY_AI_ENABLED === 'true'

// ── Redacción de copy público: tier calidad (copy de marca es-CL client/candidate-facing) ──
export const HIRING_VACANCY_COPY_PROVIDER = 'anthropic' as const

/**
 * Default = Claude Sonnet 5 (`claude-sonnet-5`): el aviso publicado es copy de marca público;
 * la adherencia a voz Efeonce + es-CL importa más que el costo (volumen bajo: un draft por
 * vacante). Override por env `HIRING_VACANCY_AI_COPY_MODEL`.
 */
export const getHiringVacancyCopyModel = (): string =>
  process.env.HIRING_VACANCY_AI_COPY_MODEL?.trim() || 'claude-sonnet-5'

export const HIRING_VACANCY_COPY_PROMPT_VERSION = 'hiring_vacancy_ai_public_copy.v1'
