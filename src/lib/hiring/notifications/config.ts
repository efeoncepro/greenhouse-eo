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

/**
 * TASK-1762 — cierre de vacante por capacidad. Dos flags con propósitos distintos, ambos leídos
 * SÓLO en el ops-worker: prenderlos en Vercel no hace nada y dejaría la UI prometiendo un cierre
 * que nunca se ejecuta.
 *
 * `CLOSURE` gobierna que el reconciler ejecute el run. `EMAIL` gobierna sólo el correo, y es un
 * freno independiente sobre el primero: un cierre manda N correos de golpe y un correo emitido no
 * se retira, así que hay que poder cerrar SIN notificar para un canary. El kill-switch por tipo en
 * `email_type_config` es la tercera capa, y es la que permite pausar este correo sin silenciar el
 * de decisión individual.
 */
export const HIRING_OPENING_CAPACITY_CLOSURE_FLAG = 'HIRING_OPENING_CAPACITY_CLOSURE_ENABLED'

export const isHiringOpeningCapacityClosureEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[HIRING_OPENING_CAPACITY_CLOSURE_FLAG]?.trim().toLowerCase() === 'true'

export const HIRING_CAPACITY_FILLED_EMAIL_FLAG = 'HIRING_CAPACITY_FILLED_EMAIL_ENABLED'

export const isHiringCapacityFilledEmailEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[HIRING_CAPACITY_FILLED_EMAIL_FLAG]?.trim().toLowerCase() === 'true'
