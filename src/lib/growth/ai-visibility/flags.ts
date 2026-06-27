/**
 * TASK-1226 — Growth AI Visibility Grader · Feature flags (Slice 3).
 *
 * Flags env-var del grader, TODOS default OFF (ver FEATURE_FLAG_STATE_LEDGER).
 * El kill switch global `GROWTH_AI_VISIBILITY_GRADER_ENABLED` gatea a todos; cada
 * provider tiene además su propio flag. Sin flag → el adapter resuelve enabled=
 * false y produce skip controlado (NUNCA crash). Lectura pura de env (testeable).
 */

import { type GrowthAiVisibilityProviderId } from './contracts'

export const GROWTH_AI_VISIBILITY_GRADER_FLAG = 'GROWTH_AI_VISIBILITY_GRADER_ENABLED'

export const GROWTH_AI_VISIBILITY_PROVIDER_FLAGS: Record<GrowthAiVisibilityProviderId, string> = {
  openai: 'GROWTH_AI_VISIBILITY_OPENAI_ENABLED',
  anthropic: 'GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED',
  perplexity: 'GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED',
  gemini: 'GROWTH_AI_VISIBILITY_GEMINI_ENABLED',
  google_ai_overview: 'GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED'
}

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch global. Default OFF. */
export const isGraderEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_GRADER_FLAG])

/** Flag del provider (solo cuenta si el grader global está ON). Default OFF. */
export const isProviderFlagEnabled = (
  provider: GrowthAiVisibilityProviderId,
  env: NodeJS.ProcessEnv = process.env
): boolean => isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_PROVIDER_FLAGS[provider]])

/**
 * TASK-1227 — Fallback LLM de extracción para campos de prosa (sentiment,
 * categoryAssociations, messageDriftClaims, refinar ambiguous). Default OFF: sin
 * el flag, el normalizer es determinista-first y preserva `unknown`.
 */
export const GROWTH_AI_VISIBILITY_LLM_EXTRACTION_FLAG = 'GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED'

export const isLlmExtractionEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_LLM_EXTRACTION_FLAG])

/**
 * TASK-1234 — Cutover inline → async. Default OFF: el endpoint admin ejecuta el run
 * INLINE (como hoy; sólo `light`/OpenAI cabe en el timeout de la función Vercel).
 * Con ON: el endpoint ENCOLA el run `pending` (202 + runId) y el worker Cloud Run
 * lo ejecuta async (sin límite de duración) — única vía para runs `full` multi-provider.
 */
export const GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_FLAG = 'GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED'

export const isAsyncExecutionEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_FLAG])

/**
 * TASK-1240 — Intake público (lead magnet). Default OFF: el POST público está cerrado
 * (404) hasta el rollout + sign-off legal del consent + secret de captcha. Gateado además
 * por el kill switch `isGraderEnabled`. Con ON: el endpoint público acepta el intake
 * (captcha + rate-limit + cost ceiling) y encola un run `public_diagnostic`+`light`.
 */
export const GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_FLAG = 'GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED'

export const isPublicIntakeEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_FLAG])

/**
 * TASK-1251 — Convergencia del intake del grader sobre el motor Growth Forms.
 * Default OFF: `POST /run` usa el path a-medida actual (`createPublicGraderRun` inline).
 * Con ON: `POST /run` actúa como fachada que persiste un SUBMISSION del motor
 * (`form_submission` + consent_snapshot + outbox `growth.forms.submission_accepted`);
 * un reactive consumer scoped al grader-form encola el run + persiste el lead (no inline).
 * Como el intake público NO ha lanzado (sin tráfico vivo), el cutover es converge-before-launch:
 * prender este flag junto a `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` cuando se lance.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_FLAG = 'GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED'

export const isGraderIntakeOnFormsEngineEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_FLAG])

/**
 * TASK-1242 — HubSpot lead handoff. Default OFF: el reactive consumer resuelve disabled y
 * produce `skipped` (NUNCA escribe a HubSpot, NUNCA crash). El enqueue del evento igual
 * ocurre (barato); el gate vive en el WRITE (execute) para no perder eventos al prender.
 * Con ON: el consumer hace el upsert contact/company en HubSpot (cliente in-app directo).
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_LEAD_HANDOFF_FLAG = 'GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED'

export const isLeadHandoffEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_LEAD_HANDOFF_FLAG])

/**
 * TASK-1250 — Email transaccional de entrega del informe al lead. Default OFF: el reactive
 * consumer resuelve disabled y produce `skipped` (NUNCA envía email, NUNCA crash). El enqueue
 * del evento igual ocurre (barato); el gate vive en el WRITE (dispatch) para no perder eventos
 * al prender. Con ON: el consumer arma el adjunto PDF público-safe + envía vía `sendEmail`,
 * con consent-gate, gate de estado del reporte e idempotencia DB-level por (report_id, email_type).
 * No production send hasta TASK-1246. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md
 * (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_REPORT_EMAIL_FLAG = 'GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED'

export const isReportEmailDeliveryEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_REPORT_EMAIL_FLAG])
