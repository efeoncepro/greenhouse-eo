import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-813 Slice 6 — Reliability signal reader.
 *
 * Cuenta servicios en `greenhouse_core.services` con `hubspot_service_id`
 * poblado pero sin sync reciente (last_synced_at NULL o > 24h). Detecta
 * stale data en la capa engagement instance: si el webhook HubSpot está
 * caído o el cron safety-net falla, esta señal lo expone.
 *
 * Solo cuenta filas activas y NO archived (excluye legacy seed). Filas
 * sin `hubspot_service_id` quedan fuera (legítimamente standalone).
 *
 * **Kind**: `lag`. Steady state esperado = 0.
 * **Severidad**: `warning` cuando count > 0. No es error porque el sync
 * eventual converge — pero alerta al operador para investigar webhook
 * config o cron Cloud Scheduler.
 */
export const SERVICES_SYNC_LAG_SIGNAL_ID = 'commercial.service_engagement.sync_lag'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.services
  WHERE active = TRUE
    AND status != 'legacy_seed_archived'
    AND hubspot_service_id IS NOT NULL
    AND (
      hubspot_last_synced_at IS NULL
      OR hubspot_last_synced_at < NOW() - INTERVAL '24 hours'
    )
`

export const getServicesSyncLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: SERVICES_SYNC_LAG_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'lag',
      source: 'getServicesSyncLagSignal',
      label: 'HubSpot p_services sync lag',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Servicios HubSpot sincronizados al día (≤ 24h).'
          : `${count} ${count === 1 ? 'servicio' : 'servicios'} con sync stale (>24h). Verificar webhook hubspot-services o cron Cloud Scheduler.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_core.services WHERE hubspot_last_synced_at < NOW() - INTERVAL 24h'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'reliability_signal_services_sync_lag' }
    })

    return {
      signalId: SERVICES_SYNC_LAG_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'lag',
      source: 'getServicesSyncLagSignal',
      label: 'HubSpot p_services sync lag',
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
