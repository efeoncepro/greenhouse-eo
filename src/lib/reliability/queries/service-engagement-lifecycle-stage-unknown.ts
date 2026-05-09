import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-836 Slice 7 — reliability signal reader.
 *
 * Cuenta services con `unmapped_reason='unknown_pipeline_stage'`. Indica que
 * un stage HubSpot llegó al UPSERT pero el mapper canónico (Slice 3) no lo
 * reconoció. Operador debe extender el mapper antes de aprobar más operación
 * sobre esa stage.
 *
 * Steady state esperado = 0.
 * Severidad = error cuando count > 0 (no warning — los services con stage
 * desconocida quedan paused/active=FALSE y NO contaminan P&L, pero indican
 * drift de configuración HubSpot vs código que requiere acción explícita).
 */

export const SERVICE_ENGAGEMENT_LIFECYCLE_STAGE_UNKNOWN_SIGNAL_ID = 'commercial.service_engagement.lifecycle_stage_unknown'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.services
  WHERE unmapped_reason = 'unknown_pipeline_stage'
    AND status != 'legacy_seed_archived'
`

export const getServiceEngagementLifecycleStageUnknownSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICE_ENGAGEMENT_LIFECYCLE_STAGE_UNKNOWN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementLifecycleStageUnknownSignal',
      label: 'HubSpot service stage unknown',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todos los services HubSpot mapean a un lifecycle stage canónico.'
          : `${count} ${count === 1 ? 'servicio quedó' : 'servicios quedaron'} con stage HubSpot no reconocido por el mapper canónico. Extender service-lifecycle-mapper.ts antes de aprobar más operación.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_core.services WHERE unmapped_reason = 'unknown_pipeline_stage'"
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_service_engagement_lifecycle_stage_unknown' }
    })

    return {
      signalId: SERVICE_ENGAGEMENT_LIFECYCLE_STAGE_UNKNOWN_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementLifecycleStageUnknownSignal',
      label: 'HubSpot service stage unknown',
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
