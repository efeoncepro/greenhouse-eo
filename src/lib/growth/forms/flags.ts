/**
 * TASK-1229 — Growth Forms engine · feature flags (default OFF).
 *
 * `GROWTH_FORMS_PUBLIC_API_ENABLED` gatea el render/submit público. Sin flag → el
 * endpoint público resuelve `disabled` (404), aun si hubiera forms publicados.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_FORMS_PUBLIC_API_FLAG = 'GROWTH_FORMS_PUBLIC_API_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch del API público de forms. Default OFF. */
export const isFormsPublicApiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_PUBLIC_API_FLAG])

/**
 * Límites de abuse-guard del motor (rate-limit per-email/per-IP). Forms no tiene costo
 * LLM, así que el presupuesto global queda en Infinity (el circuit-breaker de costo se
 * desactiva; sólo opera el rate-limit). Consumido por el abuse-guard core compartido.
 */
export const resolveFormsAbuseLimits = (env: NodeJS.ProcessEnv = process.env) => ({
  perEmailPerDay: Number(env.GROWTH_FORMS_PER_EMAIL_PER_DAY) || 10,
  perIpPerDay: Number(env.GROWTH_FORMS_PER_IP_PER_DAY) || 30,
  globalDailyBudgetUsd: Number.POSITIVE_INFINITY,
})
