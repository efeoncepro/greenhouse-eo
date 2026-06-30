import 'server-only'

/**
 * TASK-1254 — Growth Forms email verification · reliability signals (`growth.forms.email_*`).
 *
 * Dos signals desde DATA REAL persistida (ventana 1 día):
 *  - email_rejection_rate: submissions rechazadas por el gate corporativo
 *    (`rejection_reason_class IN email_not_corporate/email_disposable`). Su spike es la
 *    alerta canónica de "el gate corporativo está matando conversión" (risk matrix). Con
 *    la política OFF o en `warn`/`tag_only` queda en 0 (steady ok).
 *  - email_suspect_lead_rate: leads ACEPTADOS marcados `email_quality='suspect'` (gmail /
 *    desechable bajo política `warn`/`tag_only`). Posture, no error.
 *
 * Follow-ups (NO implementados acá — requieren contadores de runtime que el provider noop
 * actual no produce): `email_provider_error_rate` (errores/timeouts del provider Tier 2) y
 * `email_verification_cache_hit_rate` (ratio hit/miss). Ambos necesitan un provider real +
 * una capa de contadores; emitirlos hoy sería data engañosa. Ver TASK-1254 §Follow-ups.
 *
 * DB vacía / política OFF → steady ok. Error de lectura → severity unknown.
 */
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_FORMS_EMAIL_REJECTION_SIGNAL_ID = 'growth.forms.email_rejection_rate'
export const GROWTH_FORMS_EMAIL_SUSPECT_SIGNAL_ID = 'growth.forms.email_suspect_lead_rate'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthFormsEmailSignals'

export const getGrowthFormsEmailSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{ total: number; email_rejected: number; suspect_accepted: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (
           WHERE status = 'rejected'
             AND rejection_reason_class IN ('email_not_corporate', 'email_disposable')
         )::int AS email_rejected,
         COUNT(*) FILTER (WHERE status = 'accepted' AND email_quality = 'suspect')::int AS suspect_accepted
       FROM greenhouse_growth.form_submission
       WHERE created_at > NOW() - INTERVAL '1 day'`,
    )

    const total = Number(rows[0]?.total ?? 0)
    const emailRejected = Number(rows[0]?.email_rejected ?? 0)
    const suspectAccepted = Number(rows[0]?.suspect_accepted ?? 0)

    return [
      {
        signalId: GROWTH_FORMS_EMAIL_REJECTION_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: SOURCE,
        label: 'Rechazos por gate de correo corporativo en 24 h (Growth Forms)',
        // Rechazar un no-corporativo es comportamiento esperado del gate; la SEÑAL útil es el
        // volumen/ratio para detectar un gate mal calibrado. Severity ok por construcción.
        severity: 'ok',
        summary:
          total === 0
            ? 'Sin submissions en 24 h (esperado con la política OFF/pre-launch).'
            : `${emailRejected}/${total} submissions rechazadas por el gate de correo corporativo en 24 h.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'email_rejected', value: String(emailRejected) },
          { kind: 'metric', label: 'total', value: String(total) },
        ],
      },
      {
        signalId: GROWTH_FORMS_EMAIL_SUSPECT_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: SOURCE,
        label: 'Leads aceptados marcados sospechosos en 24 h (Growth Forms)',
        severity: 'ok',
        summary:
          total === 0
            ? 'Sin submissions en 24 h.'
            : `${suspectAccepted} lead(s) aceptados marcados sospechosos (gmail/desechable) en 24 h.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'suspect_accepted', value: String(suspectAccepted) }],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_growth_forms_email' } })

    return [
      {
        signalId: GROWTH_FORMS_EMAIL_REJECTION_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture' as const,
        source: SOURCE,
        label: 'Rechazos por gate de correo corporativo en 24 h (Growth Forms)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) },
        ],
      },
    ]
  }
}
