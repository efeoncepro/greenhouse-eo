import 'server-only'

import type { IntakeLimits } from '@/lib/growth/public-submission/abuse-guard'

// TASK-1367 — Config del apply público. Flag default OFF (el endpoint es 404 invisible hasta
// prenderlo — mirror del public-intake del grader). Salts estáticos para hashear email/IP (solo
// para contar ventanas de rate-limit; NUNCA seguridad). Sin costo LLM → budget desactivado.

/** Flag canónico. Default OFF hasta smoke en staging + sign-off (Runtime Rollout Completion Gate). */
export const isHiringPublicApplicationsEnabled = (): boolean =>
  process.env.HIRING_PUBLIC_APPLICATIONS_ENABLED === 'true'

// Salts byte-estables: cambiarlos orfana los contadores de ventana en vuelo.
export const HIRING_INTAKE_EMAIL_SALT = 'gh-hiring-apply-intake-email-v1'
export const HIRING_INTAKE_IP_SALT = 'gh-hiring-apply-intake-ip-v1'

/** Límites de rate-limit (override por env). Budget Infinity = sin circuit breaker de costo (no hay LLM). */
export const resolveHiringIntakeLimits = (env: NodeJS.ProcessEnv = process.env): IntakeLimits => ({
  perEmailPerDay: Number(env.HIRING_INTAKE_PER_EMAIL_PER_DAY) || 5,
  perIpPerDay: Number(env.HIRING_INTAKE_PER_IP_PER_DAY) || 20,
  globalDailyBudgetUsd: Number.POSITIVE_INFINITY,
})
