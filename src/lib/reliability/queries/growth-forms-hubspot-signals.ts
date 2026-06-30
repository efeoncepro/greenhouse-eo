import 'server-only'

/**
 * TASK-1230 — Growth Forms · HubSpot secure-submit adapter reliability signal.
 *
 * Cuenta attempts del adapter HubSpot Forms (`adapter_version='hsforms-v3-secure-submit'`)
 * fallidos en 24 h + dead-letter absoluto. Steady=0. Un `dead_letter` significa que la
 * entrega agotó reintentos (token/scope `forms` revocado, mapping inválido, HubSpot
 * caído) y un lead NO llegó a HubSpot — requiere humano. Error de lectura → unknown.
 */
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_FORMS_HUBSPOT_SUBMIT_FAILED_SIGNAL_ID = 'growth.forms.hubspot_submit_failed'

const ADAPTER_VERSION = 'hsforms-v3-secure-submit'

export const getGrowthFormsHubspotSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{ failed_24h: number; dead_letter: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 day')::int AS failed_24h,
         COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS dead_letter
       FROM greenhouse_growth.form_destination_attempt
       WHERE adapter_version = $1`,
      [ADAPTER_VERSION],
    )

    const failed24h = Number(rows[0]?.failed_24h ?? 0)
    const deadLetter = Number(rows[0]?.dead_letter ?? 0)

    return [
      {
        signalId: GROWTH_FORMS_HUBSPOT_SUBMIT_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'dead_letter',
        source: 'getGrowthFormsHubspotSignals',
        label: 'Entregas HubSpot Forms fallidas (Growth Forms)',
        severity: deadLetter > 0 ? 'error' : failed24h > 0 ? 'warning' : 'ok',
        summary:
          deadLetter > 0
            ? `${deadLetter} entrega(s) a HubSpot Forms en dead-letter — leads no llegaron, requiere intervención (token/scope/mapping/HubSpot).`
            : failed24h > 0
              ? `${failed24h} intentos de entrega a HubSpot Forms fallaron en 24 h (reintentando).`
              : 'Sin fallos de entrega a HubSpot Forms.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'dead_letter', value: String(deadLetter) },
          { kind: 'metric', label: 'failed_24h', value: String(failed24h) },
        ],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', { tags: { source: 'reliability_signal_growth_forms_hubspot' } })

    return [
      {
        signalId: GROWTH_FORMS_HUBSPOT_SUBMIT_FAILED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'dead_letter' as const,
        source: 'getGrowthFormsHubspotSignals',
        label: 'Entregas HubSpot Forms fallidas (Growth Forms)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }],
      },
    ]
  }
}
