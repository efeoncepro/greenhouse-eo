import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-655 Slice 3 — Reliability signal: API Platform commands wedged in `processing`.
 *
 * Cuenta filas en `greenhouse_core.api_platform_command_executions` con
 * `status = 'processing'` cuya `expires_at` ya pasó. Steady state esperado = 0.
 *
 * **Por qué importa**: el command wrapper (`runOwnedExecution`) envuelve el handler en
 * try/catch y marca `failed` ante CUALQUIER throw, así que el único modo de quedar
 * atascado en `processing` es un hard-crash del runtime (OOM / kill) entre el claim y
 * el write de complete/fail. Cuando eso pasa con una `Idempotency-Key`, la key queda
 * wedge: cada reintento del consumer recibe `409 idempotency_in_progress` para siempre,
 * porque nadie marca esa ejecución como terminal. Este signal lo vuelve visible en
 * `/admin/operations` para que un operador la resuelva (la fila expirada se puede
 * limpiar para liberar la key).
 *
 * **Threshold**: `expires_at` (24h TTL del command). Una ejecución legítima nunca corre
 * tanto; superar el TTL en `processing` = ejecución abandonada, no lenta.
 *
 * **Kind**: `drift` (estado que debió resolverse y no lo hizo).
 * **Severidad**: `error` cuando count > 0.
 *
 * Pattern reference: TASK-773 Slice 4 (outbox-unpublished-lag.ts).
 */
export const API_PLATFORM_COMMAND_STUCK_PROCESSING_SIGNAL_ID = 'platform.command.stuck_processing'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.api_platform_command_executions
  WHERE status = 'processing'
    AND expires_at < CURRENT_TIMESTAMP
`

export const getApiPlatformCommandStuckProcessingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: API_PLATFORM_COMMAND_STUCK_PROCESSING_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getApiPlatformCommandStuckProcessingSignal',
      label: 'Commands de API Platform atascados (processing > TTL)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin commands atascados. Toda ejecución llegó a completed o failed.'
          : `${count} command${count === 1 ? '' : 's'} en processing pasado su TTL (24h). Un runtime crasheó entre el claim y el cierre — la Idempotency-Key queda wedge (409 in-progress perpetuo) hasta limpiar la fila expirada.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_core.api_platform_command_executions WHERE status='processing' AND expires_at < NOW()"
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-655-api-platform-command-idempotency-foundation.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_api_platform_command_stuck_processing' }
    })

    return {
      signalId: API_PLATFORM_COMMAND_STUCK_PROCESSING_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getApiPlatformCommandStuckProcessingSignal',
      label: 'Commands de API Platform atascados (processing > TTL)',
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
