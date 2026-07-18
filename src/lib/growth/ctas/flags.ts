/**
 * TASK-1339 — Growth CTA engine · feature flag (default OFF).
 *
 * `GROWTH_CTA_ENGINE_ENABLED` gatea las rutas públicas Y admin del motor de CTAs.
 * Sin flag → los endpoints resuelven `disabled` (404), aun con CTAs publicados.
 * El flip productivo se coordina con TASK-1340 (renderer); sin renderer la
 * foundation queda en shadow. Registrado en docs/operations/FEATURE_FLAG_STATE_LEDGER.md
 * (gate docs:closure-check). Runtime que lo lee: Vercel (rutas API); no hay consumer
 * en workers Cloud Run.
 */
export const GROWTH_CTA_ENGINE_FLAG = 'GROWTH_CTA_ENGINE_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch del motor de CTAs (público + admin). Default OFF. */
export const isCtaEngineEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_CTA_ENGINE_FLAG])

/**
 * Límites de abuse-guard del ingest público (rate-limit per-visitor/per-IP sobre el
 * ledger Tier A). El motor no tiene costo LLM → presupuesto global Infinity (solo
 * opera el rate-limit). Consumido por el core compartido `decideAbuse`
 * (`src/lib/growth/public-submission`).
 */
export const resolveCtaAbuseLimits = (env: NodeJS.ProcessEnv = process.env) => ({
  perVisitorPerDay: Number(env.GROWTH_CTA_PER_VISITOR_PER_DAY) || 120,
  perIpPerDay: Number(env.GROWTH_CTA_PER_IP_PER_DAY) || 600,
})

/** Ventana de dedupe/idempotencia del ingest (minutos): mismo visitor+kind+versión ⇒ evento idempotente. */
export const resolveCtaDedupeWindowMinutes = (env: NodeJS.ProcessEnv = process.env): number =>
  Number(env.GROWTH_CTA_DEDUPE_WINDOW_MINUTES) || 30

/** Tope de escrituras de rechazo por IP/hora (evita que la forja infle el propio ledger de rechazos). */
export const resolveCtaRejectionWriteCapPerHour = (env: NodeJS.ProcessEnv = process.env): number =>
  Number(env.GROWTH_CTA_REJECTION_WRITE_CAP_PER_HOUR) || 20
