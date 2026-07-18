/**
 * TASK-1339 — Reliability signals del motor Growth CTA (`growth.cta.*`).
 *
 * Fuente PG = `greenhouse_growth.cta_conversion_event` (los signals leen tablas de
 * dominio, NUNCA Sentry): los rechazos de ingest (`ingest_status='rejected'`) son la
 * evidencia de forja/mismatch (§16.1); los breadcrumbs server_confirmed `error` con
 * `payload.reason` son la evidencia operacional (render/ingest/handoff). Nota honesta:
 * los "rates" se reportan como CONTEOS del último día (steady=0) — el motor no
 * persiste volumen de render por request (eso sería Tier B, fuera de OLTP por regla
 * dura arch §9.4), así que no hay denominador para una tasa real.
 */
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_CTA_RENDER_ERROR_SIGNAL_ID = 'growth.cta.render_error_rate'
export const GROWTH_CTA_INGEST_ERROR_SIGNAL_ID = 'growth.cta.event_ingest_error_rate'
export const GROWTH_CTA_SURFACE_UNAUTHORIZED_SIGNAL_ID = 'growth.cta.surface_unauthorized_attempt'
export const GROWTH_CTA_FORM_HANDOFF_FAILED_SIGNAL_ID = 'growth.cta.form_handoff_failed'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthCtaSignals'

export const getGrowthCtaSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{
      render_errors: number
      ingest_errors: number
      unauthorized: number
      handoff_failed: number
    }>(
      `SELECT
         COUNT(*) FILTER (
           WHERE event_kind = 'error' AND trust_level = 'server_confirmed'
             AND event_payload_json->>'reason' = 'render_error'
         )::int AS render_errors,
         COUNT(*) FILTER (
           WHERE event_kind = 'error' AND trust_level = 'server_confirmed'
             AND event_payload_json->>'reason' = 'ingest_error'
         )::int AS ingest_errors,
         COUNT(*) FILTER (WHERE ingest_status = 'rejected')::int AS unauthorized,
         COUNT(*) FILTER (
           WHERE event_kind = 'error' AND trust_level = 'server_confirmed'
             AND event_payload_json->>'reason' = 'form_handoff_failed'
         )::int AS handoff_failed
       FROM greenhouse_growth.cta_conversion_event
       WHERE created_at > NOW() - INTERVAL '1 day'`,
    )

    const counts = rows[0] ?? { render_errors: 0, ingest_errors: 0, unauthorized: 0, handoff_failed: 0 }

    return [
      {
        signalId: GROWTH_CTA_RENDER_ERROR_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'runtime',
        source: SOURCE,
        label: 'Errores de render del motor de CTAs (último día)',
        severity: counts.render_errors > 0 ? 'warning' : 'ok',
        summary:
          counts.render_errors === 0
            ? 'Sin errores de render.'
            : `${counts.render_errors} día(s)-error de render en las últimas 24h (breadcrumb dedupe 1/día).`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'render_errors', value: String(counts.render_errors) }],
      },
      {
        signalId: GROWTH_CTA_INGEST_ERROR_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'runtime',
        source: SOURCE,
        label: 'Errores internos del ingest de eventos CTA (último día)',
        severity: counts.ingest_errors > 0 ? 'warning' : 'ok',
        summary:
          counts.ingest_errors === 0
            ? 'Sin errores internos de ingest.'
            : `${counts.ingest_errors} día(s)-error de ingest en las últimas 24h (breadcrumb dedupe 1/día).`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'ingest_errors', value: String(counts.ingest_errors) }],
      },
      {
        signalId: GROWTH_CTA_SURFACE_UNAUTHORIZED_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality',
        source: SOURCE,
        label: 'Intentos de ingest no autorizados/forjados (CTA, último día)',
        severity: counts.unauthorized > 50 ? 'error' : counts.unauthorized > 0 ? 'warning' : 'ok',
        summary:
          counts.unauthorized === 0
            ? 'Sin intentos no autorizados.'
            : `${counts.unauthorized} intento(s) rechazado(s) (embed key/origin/version↔surface mismatch) en las últimas 24h.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'unauthorized_attempts', value: String(counts.unauthorized) }],
      },
      {
        signalId: GROWTH_CTA_FORM_HANDOFF_FAILED_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'runtime',
        source: SOURCE,
        label: 'Handoff CTA → Growth Form roto (último día)',
        severity: counts.handoff_failed > 0 ? 'error' : 'ok',
        summary:
          counts.handoff_failed === 0
            ? 'Todos los CTAs publicados resuelven su form de destino.'
            : `${counts.handoff_failed} CTA(s) publicado(s) apuntan a un form que ya no resuelve — excluidos del render (campaña a oscuras).`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'form_handoff_failed', value: String(counts.handoff_failed) }],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_growth_cta' } })

    return [
      {
        signalId: GROWTH_CTA_RENDER_ERROR_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'runtime',
        source: SOURCE,
        label: 'Errores de render del motor de CTAs (último día)',
        severity: 'unknown',
        summary: 'No fue posible evaluar los signals del motor de CTAs.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : 'unknown' },
        ],
      },
    ]
  }
}
