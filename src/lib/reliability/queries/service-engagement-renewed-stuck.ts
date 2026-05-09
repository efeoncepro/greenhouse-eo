import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-836 Slice 7 — reliability signal reader.
 *
 * Cuenta services con `pipeline_stage='renewed'` por más de 60 días.
 *
 * `renewed` es una etapa transitoria operativa: HubSpot debería promover el
 * service de `Renovado` a `Activo` cuando inicia el siguiente ciclo de
 * billing. Si HubSpot no promueve y el service queda atrapado en `Renovado`,
 * indica drift en la operación (probablemente operador HubSpot olvidó
 * mover la stage).
 *
 * Greenhouse NUNCA promueve unilateralmente — HubSpot es source of truth de
 * stage. Este signal escala el problema operacionalmente para que el operador
 * lo resuelva en HubSpot.
 *
 * Steady state esperado = 0 (en operación normal, services se mueven de
 * Renovado a Activo en días, no semanas).
 * Severidad = warning cuando count > 0.
 *
 * Threshold 60 días alineado con `Detailed Spec > Politica Renovado` de
 * la spec TASK-836.
 */

export const SERVICE_ENGAGEMENT_RENEWED_STUCK_SIGNAL_ID = 'commercial.service_engagement.renewed_stuck'

const STUCK_DAYS = 60

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.services
  WHERE pipeline_stage = 'renewed'
    AND active = TRUE
    AND status != 'legacy_seed_archived'
    AND updated_at < NOW() - INTERVAL '${STUCK_DAYS} days'
`

export const getServiceEngagementRenewedStuckSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICE_ENGAGEMENT_RENEWED_STUCK_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementRenewedStuckSignal',
      label: 'Service Renovado sin promoción',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? `Sin services atrapados en stage Renovado > ${STUCK_DAYS} días.`
          : `${count} ${count === 1 ? 'servicio lleva' : 'servicios llevan'} más de ${STUCK_DAYS} días en stage Renovado. HubSpot debería haberlos promovido a Activo. Revisar en HubSpot Service Pipeline.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `services WHERE pipeline_stage='renewed' AND updated_at < NOW() - INTERVAL ${STUCK_DAYS}d`
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'threshold_days',
          value: String(STUCK_DAYS)
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_service_engagement_renewed_stuck' }
    })

    return {
      signalId: SERVICE_ENGAGEMENT_RENEWED_STUCK_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementRenewedStuckSignal',
      label: 'Service Renovado sin promoción',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
