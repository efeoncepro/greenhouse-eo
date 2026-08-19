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
 * Default = Claude Sonnet 5 (`claude-sonnet-5`).
 *
 * DECISIÓN EXPLÍCITA (2026-08-19, operador). Calificar a una persona que postula a un trabajo es
 * un uso de ALTO RIESGO bajo el AI Act: va en el tier de calidad, no en el tier barato. La
 * generación de preguntas (abajo) sí es tier barato — un borrador que un SME gatea no es lo mismo
 * que una calificación que entra a una decisión de contratación.
 *
 * El 2026-08-18 el commit `644ac965c` movió esto a `gemini-2.5-flash` con la justificación de
 * "ruta determinista", sin ADR, sin flag, sin variable de entorno y sin gold set que midiera si
 * calificaba igual. Efecto colateral: el modelo entra al digest del run, así que TODO run anterior
 * quedó stale por definición. Se revierte al tier de calidad.
 *
 * ⚠️ El chequeo de Anthropic es ASÍNCRONO a propósito: resuelve el secreto por referencia
 * (`ANTHROPIC_API_KEY_SECRET_REF`). Nunca lo trates como síncrono — un cold start reportaría
 * "no configurado" y el scoring degradaría en silencio. Es la misma clase de bug que ISSUE-160.
 *
 * Cambiar este modelo NO es un detalle de implementación: invalida los runs vigentes y altera la
 * calibración. Exige decisión declarada y fila en el ledger de flags.
 */
export const getHiringAssessmentScoringModel = (): string =>
  process.env.HIRING_ASSESSMENT_AI_SCORING_MODEL?.trim() || 'claude-sonnet-5'

/**
 * v2 (delta 2026-08-17): el prompt declara EXPLÍCITAMENTE la escala de `perCriterion`
 * (aportes ponderados `weight`/`score` que suman el score global). v1 la dejaba implícita y el
 * modelo alternaba entre aporte y nota independiente. Las proposals v1 quedan stale por
 * `promptVersion` distinto — comportamiento correcto: no se reinterpretan bajo la escala nueva.
 */
export const HIRING_ASSESSMENT_SCORING_PROMPT_VERSION = 'hiring_assessment_ai_scoring.v2'

// ── Generación de preguntas: tier barato (el SME gatea draft→sme_review→active) ──
export const HIRING_ASSESSMENT_GENERATION_PROVIDER = 'gemini' as const

/** undefined → default del helper (gemini-2.5-flash-lite). Override opcional por env. */
export const getHiringAssessmentGenerationModel = (): string | undefined =>
  process.env.HIRING_ASSESSMENT_AI_GENERATION_MODEL?.trim() || undefined

/** Modelo efectivo para trazabilidad del ledger cuando no hay override. */
export const HIRING_ASSESSMENT_GENERATION_DEFAULT_MODEL = 'gemini-2.5-flash-lite'

export const HIRING_ASSESSMENT_GENERATION_PROMPT_VERSION = 'hiring_assessment_ai_question_gen.v1'
