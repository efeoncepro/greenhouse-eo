import 'server-only'

/**
 * TASK-1689 — Config de los emails transaccionales del ciclo de Hiring.
 *
 * El flag se lee ÚNICAMENTE en los consumers reactivos (ops-worker): prenderlo en Vercel
 * no hace nada. Declarado en `services/ops-worker/deploy.sh` + registrado en
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. Default OFF.
 */
export const HIRING_LIFECYCLE_EMAILS_FLAG = 'HIRING_LIFECYCLE_EMAILS_ENABLED'

export const isHiringLifecycleEmailsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[HIRING_LIFECYCLE_EMAILS_FLAG]?.trim().toLowerCase() === 'true'

/**
 * TASK-1746 — cutover de links de assessment path-bearer → fragment exchange.
 * Lo consume exclusivamente el sender del ops-worker. Default OFF: el core de sesión puede
 * desplegarse sin cambiar correos activos hasta completar migración, routes, tracking y smoke.
 */
export const HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_FLAG = 'HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED'

export const isHiringAssessmentPublicSessionLinksEnabled = (): boolean =>
  process.env.HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED?.trim().toLowerCase() === 'true'

/**
 * Buzón interno de People para el aviso de postulación nueva. Configurable por env;
 * NUNCA hardcodear el literal en consumers/templates.
 */
export const resolveHiringInternalNotificationsEmail = (env: NodeJS.ProcessEnv = process.env): string =>
  env.HIRING_INTERNAL_NOTIFICATIONS_EMAIL?.trim() || 'people@efeoncepro.com'

/** Base pública del portal para armar links absolutos en emails (patrón ebook-delivery). */
export const hiringPublicBaseUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.GREENHOUSE_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com').replace(/\/$/, '')
