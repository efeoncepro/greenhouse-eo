import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-765 Slice 7 — Reliability signal reader.
 *
 * Cuenta entries dead-letter en `outbox_reactive_log` para los handlers críticos
 * del path payroll → expense → payment_order:
 *
 * - `record_expense_payment_from_order:finance.payment_order.paid` — proyección
 *   que materializa expense_payments + settlement_legs cuando una order pasa
 *   a paid (slice 4 la convierte en throw-on-failure).
 * - `finance_expense_reactive_intake:payroll_period.exported` — proyección que
 *   materializa expenses desde un período payroll exportado (root cause del
 *   incidente 2026-05-01).
 *
 * Solo cuenta dead-letters NO acknowledged y NO recovered, alineado con
 * `outbox_reactive_log_active_dead_letters_idx` (TASK 2026-04-26).
 *
 * **Kind**: `dead_letter`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Significa que el reactor llegó al
 * límite de retries y nadie acuso recibo aún — el path está roto y el
 * operador necesita actuar.
 */
export const PAYMENT_ORDERS_DEAD_LETTER_SIGNAL_ID =
  'finance.payment_orders.dead_letter'

const HANDLERS = [
  'record_expense_payment_from_order:finance.payment_order.paid',
  'finance_expense_reactive_intake:payroll_period.exported'
] as const

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler = ANY($1::text[])
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL
`

export const getPaymentOrdersDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [HANDLERS])
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PAYMENT_ORDERS_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getPaymentOrdersDeadLetterSignal',
      label: 'Dead-letter del path payment_order ↔ bank',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin dead-letters activos en los handlers críticos.'
          : `${count} entry${count === 1 ? '' : 'ies'} en dead-letter sin acknowledge ni recovery.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_sync.outbox_reactive_log WHERE handler IN (...)'
        },
        {
          kind: 'metric',
          label: 'handlers',
          value: HANDLERS.join(', ')
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
      tags: { source: 'reliability_signal_payment_orders_dead_letter' }
    })

    return {
      signalId: PAYMENT_ORDERS_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'dead_letter',
      source: 'getPaymentOrdersDeadLetterSignal',
      label: 'Dead-letter del path payment_order ↔ bank',
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
