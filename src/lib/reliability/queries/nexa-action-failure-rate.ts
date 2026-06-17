import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1137 — Reliability signal: Nexa governed action failure rate.
 *
 * Cuenta eventos `failed` en `greenhouse_ai.nexa_action_events` (últimas 24h): la ejecución del
 * command bound de una acción gobernada lanzó un fault del servidor (no idempotency conflict, no
 * gap — esos son `conflict`/`execution_denied`). Steady state esperado = 0.
 *
 * Con el runtime de acciones OFF (default) no hay eventos → siempre `ok`.
 *
 * **Kind**: `drift` (estado que no debería ocurrir en operación sana).
 * **Severidad**: warning si 1-3, error si > 3 (un patrón de fallas = command roto / dependencia caída).
 */
export const NEXA_ACTION_FAILURE_RATE_SIGNAL_ID = 'nexa.action.failure_rate'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_ai.nexa_action_events
  WHERE event_type = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'
`

export const getNexaActionFailureRateSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: NEXA_ACTION_FAILURE_RATE_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaActionFailureRateSignal',
      label: 'Acciones de Nexa fallidas (24h)',
      severity: count === 0 ? 'ok' : count > 3 ? 'error' : 'warning',
      summary:
        count === 0
          ? 'Sin fallas de ejecución de acciones gobernadas en 24h.'
          : `${count} acción${count === 1 ? '' : 'es'} de Nexa falló al ejecutar en 24h (fault del command, no conflicto de idempotencia). Revisa el command bound o su dependencia.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_ai.nexa_action_events WHERE event_type='failed' AND created_at > NOW() - 24h"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1137-nexa-governed-action-runtime-command-bridge.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'home', { tags: { source: 'reliability_signal_nexa_action_failure_rate' } })

    return {
      signalId: NEXA_ACTION_FAILURE_RATE_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaActionFailureRateSignal',
      label: 'Acciones de Nexa fallidas (24h)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
