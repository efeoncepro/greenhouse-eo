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

/**
 * TASK-1428 — Enforcement de suppression/frequency capping. Default OFF = SHADOW:
 * la decisión se computa y registra en Tier B (`enforced=false`) sin alterar el
 * render (shadow-compare del rollout). ON = los candidatos suprimidos se excluyen
 * y el claim de impresión interruptiva es atómico. Registrado en
 * FEATURE_FLAG_STATE_LEDGER.md. Runtime que lo lee: Vercel (rutas API públicas).
 */
export const GROWTH_CTA_SUPPRESSION_ENFORCEMENT_FLAG = 'GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED'

export const isCtaSuppressionEnforcementEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_CTA_SUPPRESSION_ENFORCEMENT_FLAG])

/**
 * Sample rate de Tier B (0..1; default 1 = sin sampling al volumen actual). 0 apaga
 * el adapter de exposición (rollback <5 min sin redeploy de código). El rollup
 * registra observed + estimated (observed/rate) para reconciliación.
 */
export const resolveCtaExposureSampleRate = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = Number(env.GROWTH_CTA_EXPOSURE_SAMPLE_RATE)

  if (!Number.isFinite(raw)) return 1

  return Math.min(1, Math.max(0, raw))
}

/**
 * Cap engine-level de exposiciones interruptivas por sujeto/día (cross-CTA; la fila
 * `cta_id IS NULL` del visitor state). Complementa el cap per-CTA de la suppression
 * policy — un visitante nunca ve más de N prompts interruptivos al día en total.
 */
export const resolveCtaGlobalInterruptiveCapPerDay = (env: NodeJS.ProcessEnv = process.env): number =>
  Number(env.GROWTH_CTA_INTERRUPTIVE_PER_SUBJECT_PER_DAY) || 3
