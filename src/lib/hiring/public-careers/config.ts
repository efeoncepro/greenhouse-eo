import 'server-only'

import type { IntakeLimits } from '@/lib/growth/public-submission/abuse-guard'

// TASK-1367 — Config del apply público. Flag default OFF (el endpoint es 404 invisible hasta
// prenderlo — mirror del public-intake del grader). Salts estáticos para hashear email/IP (solo
// para contar ventanas de rate-limit; NUNCA seguridad). Sin costo LLM → budget desactivado.

/** Flag canónico. Default OFF hasta smoke en staging + sign-off (Runtime Rollout Completion Gate). */
export const isHiringPublicApplicationsEnabled = (): boolean =>
  process.env.HIRING_PUBLIC_APPLICATIONS_ENABLED === 'true'

/** TASK-1373 — cutover del apply público al renderer nativo Growth Forms. Default OFF. */
export const isCareersNativeGrowthFormEnabled = (): boolean => process.env.CAREERS_NATIVE_GROWTH_FORM_ENABLED === 'true'

/** TASK-1741 — variante editorial del detalle de vacante. Vercel-only, default OFF. */
export const isCareersEditorialDetailEnabled = (): boolean => process.env.CAREERS_DETAIL_EDITORIAL_V2_ENABLED === 'true'

/**
 * TASK-1740 — emisión de JSON-LD `JobPosting` en la leaf page pública de una vacante.
 * Default OFF (rollout gobernado + rollback sin revert de código). Vercel-only: se lee
 * únicamente en el SSR del detalle público.
 */
export const isHiringPublicJobPostingSchemaEnabled = (): boolean =>
  process.env.HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED === 'true' && isCareersEditorialDetailEnabled()

/**
 * TASK-1740 — base URL pública canónica de careers (canonical + JSON-LD url).
 * Mismo fallback productivo que el operator de publicación.
 */
export const resolvePublicCareersBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com').replace(/\/$/, '')

// Salts byte-estables: cambiarlos orfana los contadores de ventana en vuelo.
export const HIRING_INTAKE_EMAIL_SALT = 'gh-hiring-apply-intake-email-v1'
export const HIRING_INTAKE_IP_SALT = 'gh-hiring-apply-intake-ip-v1'

/** Límites de rate-limit (override por env). Budget Infinity = sin circuit breaker de costo (no hay LLM). */
export const resolveHiringIntakeLimits = (env: NodeJS.ProcessEnv = process.env): IntakeLimits => ({
  perEmailPerDay: Number(env.HIRING_INTAKE_PER_EMAIL_PER_DAY) || 5,
  perIpPerDay: Number(env.HIRING_INTAKE_PER_IP_PER_DAY) || 20,
  globalDailyBudgetUsd: Number.POSITIVE_INFINITY
})
