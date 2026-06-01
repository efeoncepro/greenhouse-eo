import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-981 Slice 3 — Dead-letter signal for the contractor remittance email.
 *
 * Counts `outbox_reactive_log` rows that reached dead-letter for the
 * `contractor_payable_paid_email` projection handler (and are NOT acknowledged /
 * recovered yet), aligned with `outbox_reactive_log_active_dead_letters_idx`.
 *
 * **Kind**: `dead_letter`. **moduleKey**: `finance`. Steady state = 0. Any value
 * means a paid contractor payable failed to deliver its comprobante (TASK-960) by
 * email after exhausting retries (Resend down, render failure, persistent recipient
 * issue) and needs a human — the contractor can still download it in-app meanwhile.
 *
 * Non-blocking by design: a missing recipient email or an unresolved remittance is
 * a *skip* in the projection (it returns a message), NOT a throw — so those never
 * reach dead-letter and never alert here.
 */
export const CONTRACTOR_REMITTANCE_EMAIL_DEAD_LETTER_SIGNAL_ID =
  'finance.contractor_remittance_email.dead_letter'

// handler = `<projection_name>:<trigger_event_type>`
const HANDLER = 'contractor_payable_paid_email:workforce.contractor_payable.paid'

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

export const getContractorRemittanceEmailDeadLetterSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<DeadLetterRow>(QUERY_SQL, [HANDLER])
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

      const summary =
        count === 0
          ? 'Sin dead-letters en el envío del comprobante de pago al contractor.'
          : `${count} comprobante${count === 1 ? '' : 's'} de pago en dead-letter del envío por email sin acknowledge ni recovery.`

      return {
        signalId: CONTRACTOR_REMITTANCE_EMAIL_DEAD_LETTER_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'dead_letter',
        source: 'getContractorRemittanceEmailDeadLetterSignal',
        label: 'Comprobante de pago contractor (email dead-letter)',
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
        tags: { source: 'reliability_signal_contractor_remittance_email_dead_letter' }
      })

      return {
        signalId: CONTRACTOR_REMITTANCE_EMAIL_DEAD_LETTER_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'dead_letter',
        source: 'getContractorRemittanceEmailDeadLetterSignal',
        label: 'Comprobante de pago contractor (email dead-letter)',
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
