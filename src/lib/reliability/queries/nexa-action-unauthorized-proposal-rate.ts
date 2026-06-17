import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1137 — Reliability signal (SECURITY): Nexa unauthorized/unknown action proposal rate.
 *
 * Cuenta eventos `proposal_denied` con reason `unknown_action` o `not_permitted` (últimas 24h): el
 * LLM intentó PROPONER una acción que no existe en el registry, o para la que el usuario no tiene
 * permiso. En operación sana esto es ~0: el tool `propose_action` solo se ofrece a usuarios con la
 * capability y el prompt enumera las acciones registradas. Un alza = LLM inducido a proponer algo
 * prohibido (posible prompt injection) o prompt/registry desalineados.
 *
 * Con el runtime OFF (default) el tool no se ofrece → no hay eventos → siempre `ok`.
 *
 * **Kind**: `drift`. **Severidad**: warning si 1-5, error si > 5 (patrón sostenido = investigar).
 */
export const NEXA_ACTION_UNAUTHORIZED_PROPOSAL_RATE_SIGNAL_ID = 'nexa.action.unauthorized_proposal_rate'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_ai.nexa_action_events
  WHERE event_type = 'proposal_denied'
    AND reason IN ('unknown_action', 'not_permitted')
    AND created_at > NOW() - INTERVAL '24 hours'
`

export const getNexaActionUnauthorizedProposalRateSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: NEXA_ACTION_UNAUTHORIZED_PROPOSAL_RATE_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaActionUnauthorizedProposalRateSignal',
      label: 'Propuestas de acción no permitidas de Nexa (24h)',
      severity: count === 0 ? 'ok' : count > 5 ? 'error' : 'warning',
      summary:
        count === 0
          ? 'Sin propuestas de acción no permitidas/desconocidas en 24h.'
          : `${count} propuesta${count === 1 ? '' : 's'} de acción no permitida o inexistente en 24h. Posible prompt injection o registry/prompt desalineados — investiga.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_ai.nexa_action_events WHERE event_type='proposal_denied' AND reason IN (unknown_action, not_permitted) AND created_at > NOW() - 24h"
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
    captureWithDomain(error, 'home', {
      tags: { source: 'reliability_signal_nexa_action_unauthorized_proposal_rate' }
    })

    return {
      signalId: NEXA_ACTION_UNAUTHORIZED_PROPOSAL_RATE_SIGNAL_ID,
      moduleKey: 'home',
      kind: 'drift',
      source: 'getNexaActionUnauthorizedProposalRateSignal',
      label: 'Propuestas de acción no permitidas de Nexa (24h)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
