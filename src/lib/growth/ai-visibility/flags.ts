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

/**
 * TASK-1266 — Site Readiness Probe Layer (gatherer de probes técnicos del sitio analizado).
 * Default OFF: sin el flag, el probe gatherer no se invoca (el run sigue idéntico; sólo
 * percepción). Gateado además por el kill switch `isGraderEnabled`. Con ON: tras ejecutar
 * un run, el run-engine corre los probes structural (robots IA, JSON-LD, llms.txt, sitemap)
 * read-only sobre el dominio del sujeto y persiste `grader_probe_results`. Es el flag MAESTRO
 * del eje `structural`; el eje `agentic` requiere ADEMÁS `..._AGENTIC_READINESS_ENABLED`.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_PROBES_FLAG = 'GROWTH_AI_VISIBILITY_PROBES_ENABLED'

export const isProbesEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_PROBES_FLAG])

/**
 * TASK-1266 — Eje `agentic` (operabilidad agéntica: WebMCP tools, .well-known/mcp, API
 * discoverability, DOM semántico, potentialAction). Default OFF. Requiere que los probes estén
 * ON (`isProbesEnabled`): el eje agentic es aditivo sobre el structural, no independiente.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_AGENTIC_READINESS_FLAG = 'GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED'

export const isAgenticReadinessEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isProbesEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_AGENTIC_READINESS_FLAG])

/**
 * TASK-1267 — Eje `entity` (backbone real de entidad de la marca: Google Knowledge Graph,
 * Wikidata/Wikipedia, presencia en Reddit/UGC). Probes read-only sobre APIs PÚBLICAS de
 * terceros (no el sitio del sujeto). Default OFF. Requiere que los probes estén ON
 * (`isProbesEnabled`): el eje entity es aditivo sobre el structural, no independiente —
 * igual que el eje agentic. La API key del Knowledge Graph se resuelve server-side
 * (`GOOGLE_KNOWLEDGE_GRAPH_API_KEY` / `..._SECRET_REF`); sin ella el KG probe degrada honesto.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_ENTITY_PROBES_FLAG = 'GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED'

export const isEntityProbesEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isProbesEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_ENTITY_PROBES_FLAG])

/**
 * TASK-1269 — Fix-It Artifacts (JSON-LD / llms.txt / content briefs).
 * Default OFF: los endpoints de generación no entregan artefactos hasta revisión
 * de copy/legal. Gateado además por el kill switch global del grader. La generación
 * es determinista/on-demand y no escribe en el sitio del prospecto.
 */
export const GROWTH_AI_VISIBILITY_FIX_IT_FLAG = 'GROWTH_AI_VISIBILITY_FIX_IT_ENABLED'

export const isFixItArtifactsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_FIX_IT_FLAG])

/**
 * TASK-1277 — Run gobernado de portal (chokepoint). Default OFF: las puertas cliente del
 * run (contratado/trial/pilot) están cerradas hasta el rollout + staging shadow. Gateado
 * además por el kill switch `isGraderEnabled`. Con ON: `requestGraderRunForOrganization`
 * acepta runs de portal (entitlement → ventana → allowance → costo). La puerta operador
 * (`requestGraderRunAsOperator`) NO depende de este flag — es capability-gated y unlimited.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_AI_VISIBILITY_PORTAL_RUN_FLAG = 'GROWTH_AI_VISIBILITY_PORTAL_RUN_ENABLED'

export const isPortalRunEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_PORTAL_RUN_FLAG])

/**
 * TASK-1277 — Tier trial PLG (self-serve para clientes existentes sin AEO contratado).
 * Default OFF: aunque el portal run esté ON, el tier trial no entrega allowance hasta medir
 * costo en shadow. Con ON: las orgs con assignment tier=trial reciben N runs/mes (config)
 * con reset mensual + tope global mensual de costo (backstop). Registrar en el ledger.
 */
export const GROWTH_AI_VISIBILITY_TRIAL_FLAG = 'GROWTH_AI_VISIBILITY_TRIAL_ENABLED'

export const isTrialTierEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_TRIAL_FLAG])

/**
 * TASK-1277 — Config de allowance AEO por tier (per-org-per-mes) + tope global de trials.
 * Defaults conservadores (sign-off comercial): trial 1/mes, contratado 20/mes (fair-use, NO
 * ilimitado self-serve), pilot 3/mes, tope global de trials USD 25/mes (cost backstop que
 * espeja el budget diario público de abuse-guard). Todos override-ables por env (sin deploy).
 * El costo por-run del backstop usa el cost ceiling del modo `light` (defense conservadora).
 */
export interface AeoAllowanceConfig {
  trialRunsPerMonth: number
  contractedRunsPerMonth: number
  pilotRunsPerMonth: number
  trialGlobalMonthlyBudgetUsd: number
}

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const toPositiveFloat = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? '')

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export const resolveAeoAllowanceConfig = (env: NodeJS.ProcessEnv = process.env): AeoAllowanceConfig => ({
  trialRunsPerMonth: toPositiveInt(env.GROWTH_AI_VISIBILITY_TRIAL_RUNS_PER_MONTH, 1),
  contractedRunsPerMonth: toPositiveInt(env.GROWTH_AI_VISIBILITY_CONTRACTED_RUNS_PER_MONTH, 20),
  pilotRunsPerMonth: toPositiveInt(env.GROWTH_AI_VISIBILITY_PILOT_RUNS_PER_MONTH, 3),
  trialGlobalMonthlyBudgetUsd: toPositiveFloat(env.GROWTH_AI_VISIBILITY_TRIAL_GLOBAL_MONTHLY_BUDGET_USD, 25)
})
