import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-765 Slice 7 — Reliability signal reader.
 *
 * Cuenta payment_orders en `state='paid'` que llevan más de 15 minutos sin
 * tener al menos una `payment_order_lines.expense_payment_id` asignada y NO
 * tienen un evento outbox `finance.payment_order.settlement_blocked` reciente
 * (últimos 7 días).
 *
 * El segundo NOT EXISTS evita doble-ruido cuando la order ya fue marcada como
 * blocked y está esperando resolución manual — esos casos los cubre el signal
 * `payment_orders_dead_letter` y el banner del DetailDrawer, no éste.
 *
 * **Kind**: `drift` — divergencia entre el state machine de payment_orders y
 * el ledger de expense_payments. Steady state esperado = 0.
 *
 * **Severidad**: `error` cuando count > 0. La order quedó zombie: el operador
 * la ve "pagada" pero el banco no rebajó saldo y la conciliación queda rota.
 */
export const PAYMENT_ORDERS_PAID_WITHOUT_EXPENSE_PAYMENT_SIGNAL_ID =
  'finance.payment_orders.paid_without_expense_payment'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.payment_orders po
  WHERE po.state = 'paid'
    AND po.paid_at < NOW() - INTERVAL '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.payment_order_lines pol
       WHERE pol.order_id = po.order_id
         AND pol.expense_payment_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_sync.outbox_events oe
       WHERE oe.aggregate_id = po.order_id
         AND oe.event_type = 'finance.payment_order.settlement_blocked'
         AND oe.occurred_at > NOW() - INTERVAL '7 days'
    )
`

export const getPaidOrdersWithoutExpensePaymentSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PAYMENT_ORDERS_PAID_WITHOUT_EXPENSE_PAYMENT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPaidOrdersWithoutExpensePaymentSignal',
      label: 'Órdenes pagadas sin expense_payment',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin órdenes zombie en los últimos 15 min.'
          : `${count} orden${count === 1 ? '' : 'es'} en estado pagado sin expense_payment asociado.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_finance.payment_orders + payment_order_lines (LEFT JOIN drift)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-765-payment-order-bank-settlement-resilience.md (slice 7)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_paid_orders_without_expense_payment' }
    })

    return {
      signalId: PAYMENT_ORDERS_PAID_WITHOUT_EXPENSE_PAYMENT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPaidOrdersWithoutExpensePaymentSignal',
      label: 'Órdenes pagadas sin expense_payment',
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
