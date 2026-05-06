import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-813 Slice 6 — Reliability signal reader.
 *
 * Cuenta servicios en HubSpot p_services (0-162) que no se pueden
 * materializar a `greenhouse_core.services` porque el `hubspot_company_id`
 * no resuelve a una `organizations` en Greenhouse (org no existe o no
 * tiene `hubspot_company_id` declarado).
 *
 * El reader cuenta filas en `webhook_inbox_events` que el handler
 * `hubspot-services` marcó con `status='failed'` y `error_message`
 * con prefijo `organization_unresolved:`. Cuando el operador comercial
 * crea la org en Greenhouse vía UI admin (Slice 7), el sync siguiente
 * resuelve la fila y el contador baja.
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `error` si > 7 días pendientes (escalación).
 */
export const SERVICES_ORG_UNRESOLVED_SIGNAL_ID =
  'commercial.service_engagement.organization_unresolved'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.webhook_inbox_events e
  JOIN greenhouse_sync.webhook_endpoints ep
    ON ep.webhook_endpoint_id = e.webhook_endpoint_id
  WHERE ep.endpoint_key = 'hubspot-services'
    AND e.status = 'failed'
    AND e.error_message LIKE 'organization_unresolved:%'
    AND e.received_at < NOW() - INTERVAL '7 days'
`

export const getServicesOrganizationUnresolvedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICES_ORG_UNRESOLVED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServicesOrganizationUnresolvedSignal',
      label: 'HubSpot p_services huérfanos sin organization',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin servicios HubSpot huérfanos > 7 días. Operador comercial al día con resolución.'
          : `${count} ${count === 1 ? 'servicio' : 'servicios'} HubSpot pendientes de resolución > 7 días. Operador debe crear org en Greenhouse o archivar el service en HubSpot.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'webhook_inbox_events.deferred_reason=organization_unresolved AND age > 7d'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-813 — Slice 7 manual queue UI'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'reliability_signal_services_organization_unresolved' }
    })

    return {
      signalId: SERVICES_ORG_UNRESOLVED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServicesOrganizationUnresolvedSignal',
      label: 'HubSpot p_services huérfanos sin organization',
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
