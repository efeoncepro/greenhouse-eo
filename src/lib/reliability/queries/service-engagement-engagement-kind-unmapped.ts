import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-836 Slice 7 — reliability signal reader.
 *
 * Cuenta services con `unmapped_reason='missing_classification'` AND
 * `pipeline_stage='validation'`. Estos son Sample Sprints / engagements
 * no-regulares que entraron a la stage de validación pero no tienen
 * `engagement_kind` clasificado en HubSpot todavía. El operador comercial
 * debe completar la classificación antes de que el service participe en
 * P&L/ICO/attribution.
 *
 * Steady state esperado = 0.
 * Severidad = warning cuando count > 0 (no error — el sistema tolera
 * services unmapped sin contaminar; pero requiere acción operativa).
 */

export const SERVICE_ENGAGEMENT_ENGAGEMENT_KIND_UNMAPPED_SIGNAL_ID = 'commercial.service_engagement.engagement_kind_unmapped'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.services
  WHERE unmapped_reason = 'missing_classification'
    AND pipeline_stage = 'validation'
    AND status != 'legacy_seed_archived'
`

export const getServiceEngagementEngagementKindUnmappedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICE_ENGAGEMENT_ENGAGEMENT_KIND_UNMAPPED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementEngagementKindUnmappedSignal',
      label: 'Sample Sprint sin clasificación',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Todos los Sample Sprints en stage validation tienen engagement_kind clasificado.'
          : `${count} ${count === 1 ? 'Sample Sprint requiere' : 'Sample Sprints requieren'} clasificación de tipo (regular/pilot/trial/poc/discovery) en HubSpot antes de participar en P&L/ICO.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "services WHERE unmapped_reason='missing_classification' AND pipeline_stage='validation'"
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'docs/operations/runbooks/hubspot-service-pipeline-config.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_service_engagement_engagement_kind_unmapped' }
    })

    return {
      signalId: SERVICE_ENGAGEMENT_ENGAGEMENT_KIND_UNMAPPED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServiceEngagementEngagementKindUnmappedSignal',
      label: 'Sample Sprint sin clasificación',
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
