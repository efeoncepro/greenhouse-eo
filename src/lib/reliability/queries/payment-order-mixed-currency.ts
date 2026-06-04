import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-990 Slice 6 — Reliability signal: payment orders whose currency does not
 * match a linked obligation's currency. The one-order-one-currency invariant
 * (createPaymentOrderFromObligations rejects mixed currencies + gates MXN behind
 * unsupported_corridor) makes this impossible by construction; the signal is a
 * defense-in-depth drift detector. Any count > 0 means the invariant was bypassed
 * (direct SQL, a migration, or a regression).
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0. Steady = 0.
 */
export const PAYMENT_ORDER_MIXED_CURRENCY_SIGNAL_ID = 'finance.payment_order.mixed_currency_attempt'

export const getPaymentOrderMixedCurrencySignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `SELECT COUNT(DISTINCT po.order_id)::int AS n
         FROM greenhouse_finance.payment_orders po
         JOIN greenhouse_finance.payment_order_lines pol ON pol.order_id = po.order_id
         JOIN greenhouse_finance.payment_obligations ob ON ob.obligation_id = pol.obligation_id
        WHERE ob.currency IS DISTINCT FROM po.currency`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PAYMENT_ORDER_MIXED_CURRENCY_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPaymentOrderMixedCurrencySignal',
      label: 'Payment order con currency mixta',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin payment orders con currency distinta a sus obligations.'
          : `${count} payment order${count === 1 ? '' : 's'} con currency distinta a alguna obligation enlazada. El invariante one-order-one-currency fue violado.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'SELECT COUNT(DISTINCT po.order_id) FROM payment_orders po JOIN payment_order_lines pol ON pol.order_id=po.order_id JOIN payment_obligations ob ON ob.obligation_id=pol.obligation_id WHERE ob.currency IS DISTINCT FROM po.currency'
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_payment_order_mixed_currency' }
    })

    return {
      signalId: PAYMENT_ORDER_MIXED_CURRENCY_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPaymentOrderMixedCurrencySignal',
      label: 'Payment order con currency mixta',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
