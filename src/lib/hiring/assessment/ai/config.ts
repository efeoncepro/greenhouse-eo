import 'server-only'

// TASK-1361 — Assessment AI Assist config. Seam de provider/modelo (espejo de
// workforce/contracting/ai/config.ts): el modelo se resuelve desde env var con default; swappear
// el modelo NO cambia el contrato propose→confirm. El flag gatea SOLO los propose paths (generar
// preguntas / puntajes) — el confirm/reject de propuestas existentes NO se gatea por el flag (un
// humano siempre puede drenar la cola aunque el feature esté apagado).

/** Flag canónico. Default OFF hasta eval baseline verde + sign-off (Runtime Rollout Completion Gate). */
export const isHiringAssessmentAiEnabled = (): boolean =>
  process.env.HIRING_ASSESSMENT_AI_ENABLED === 'true'

// ── Grading (respuestas open_text/situational): tier calidad/defensibilidad AI-Act ──
export const HIRING_ASSESSMENT_SCORING_PROVIDER = 'anthropic' as const

/**
 * Default = Claude Sonnet 5 (`claude-sonnet-5`, familia Claude 5 — el más reciente y capaz para el
 * grading defendible AI-Act). `generateStructuredAnthropic` recibe el model string crudo y lo pasa
 * al SDK; NO está restringido al allowlist de nexa-models.ts (ese es el router de Nexa, no el
 * universo de modelos válidos). Override por env `HIRING_ASSESSMENT_AI_SCORING_MODEL`.
 */
export const getHiringAssessmentScoringModel = (): string =>
  process.env.HIRING_ASSESSMENT_AI_SCORING_MODEL?.trim() || 'claude-sonnet-5'

export const HIRING_ASSESSMENT_SCORING_PROMPT_VERSION = 'hiring_assessment_ai_scoring.v1'

// ── Generación de preguntas: tier barato (el SME gatea draft→sme_review→active) ──
export const HIRING_ASSESSMENT_GENERATION_PROVIDER = 'gemini' as const

/** undefined → default del helper (gemini-2.5-flash-lite). Override opcional por env. */
export const getHiringAssessmentGenerationModel = (): string | undefined =>
  process.env.HIRING_ASSESSMENT_AI_GENERATION_MODEL?.trim() || undefined

/** Modelo efectivo para trazabilidad del ledger cuando no hay override. */
export const HIRING_ASSESSMENT_GENERATION_DEFAULT_MODEL = 'gemini-2.5-flash-lite'

export const HIRING_ASSESSMENT_GENERATION_PROMPT_VERSION = 'hiring_assessment_ai_question_gen.v1'
