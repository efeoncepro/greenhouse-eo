import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-793 Slice 3 — Dead-letter signal for the contractor payable → Finance
 * obligation bridge. Counts `outbox_reactive_log` rows that reached dead-letter
 * for the projection handler (and are NOT acknowledged / recovered yet), aligned
 * with `outbox_reactive_log_active_dead_letters_idx`.
 *
 * **Kind**: `dead_letter`. **moduleKey**: `finance`. Steady state = 0. Any value
 * means a payable failed to bridge to Finance after exhausting retries (bad
 * currency, FX gap, createPaymentObligation failure) and needs a human.
 */
export const CONTRACTOR_PAYABLE_BRIDGE_DEAD_LETTER_SIGNAL_ID =
  'finance.contractor_payable.bridge_dead_letter'

// handler = `<projection_name>:<trigger_event_type>`
const HANDLER =
  'contractor_payable_finance_obligation:workforce.contractor_payable.ready_for_finance'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler = $1
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL
`

type DeadLetterRow = {
  n: number
}

export const getContractorPayableBridgeDeadLetterSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<DeadLetterRow>(QUERY_SQL, [HANDLER])
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

      const summary =
        count === 0
          ? 'Sin dead-letters en el bridge contractor payable → Finance.'
          : `${count} payable${count === 1 ? '' : 's'} en dead-letter del bridge a Finance sin acknowledge ni recovery.`

      return {
        signalId: CONTRACTOR_PAYABLE_BRIDGE_DEAD_LETTER_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'dead_letter',
        source: 'getContractorPayableBridgeDeadLetterSignal',
        label: 'Bridge contractor payable → Finance (dead-letter)',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value: "greenhouse_sync.outbox_reactive_log WHERE handler = '<...>' AND result = 'dead-letter'"
          },
          {
            kind: 'metric',
            label: 'handler',
            value: HANDLER
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'reliability_signal_contractor_payable_bridge_dead_letter' }
      })

      return {
        signalId: CONTRACTOR_PAYABLE_BRIDGE_DEAD_LETTER_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'dead_letter',
        source: 'getContractorPayableBridgeDeadLetterSignal',
        label: 'Bridge contractor payable → Finance (dead-letter)',
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
