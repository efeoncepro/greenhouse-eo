import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-813 Slice 6 — Reliability signal reader.
 *
 * Cuenta filas legacy archived (`status='legacy_seed_archived'`) que
 * todavía aparecen referenciadas por consumers downstream — específicamente
 * `service_attribution_facts` con FK al service_id archived.
 *
 * Si > 0 después del archive script (Slice 2): un materializer se ejecutó
 * contra fila archived. Indica que algún consumer no respeta el filtro
 * `WHERE active=TRUE AND status != 'legacy_seed_archived'` y está
 * atribuyendo costo/datos a un service fantasma.
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Significa contaminación
 * cross-domain — Finance/Delivery puede estar leyendo datos basura.
 *
 * **Hard rule** documentada en TASK-813: "SIEMPRE que un consumer
 * Finance/Delivery necesite el servicio del cliente X período Y, filtrar
 * WHERE active=TRUE AND status != 'legacy_seed_archived'".
 */
export const SERVICES_LEGACY_RESIDUAL_READS_SIGNAL_ID =
  'commercial.service_engagement.legacy_residual_reads'

const QUERY_SQL = `
  SELECT COUNT(DISTINCT s.service_id)::int AS n
  FROM greenhouse_core.services s
  WHERE s.status = 'legacy_seed_archived'
    AND EXISTS (
      SELECT 1
      FROM greenhouse_serving.service_attribution_facts saf
      WHERE saf.service_id = s.service_id
        AND saf.materialized_at > s.updated_at
    )
`

export const getServicesLegacyResidualReadsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICES_LEGACY_RESIDUAL_READS_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServicesLegacyResidualReadsSignal',
      label: 'Services legacy residual reads',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin reads downstream contra services archived. Filtro active+status respetado.'
          : `${count} ${count === 1 ? 'service' : 'services'} archived con attribution_facts post-archive. Algún materializer no filtra por status — contamina P&L.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'service_attribution_facts.materialized_at > services.updated_at WHERE status=archived'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Hard rule',
          value: 'TASK-813: WHERE active=TRUE AND status != legacy_seed_archived'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'reliability_signal_services_legacy_residual_reads' }
    })

    return {
      signalId: SERVICES_LEGACY_RESIDUAL_READS_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getServicesLegacyResidualReadsSignal',
      label: 'Services legacy residual reads',
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
