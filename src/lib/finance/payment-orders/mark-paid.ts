import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'

export interface MarkPaymentOrderPaidInput {
  orderId: string
  paidBy: string
  paidAt?: string
  externalReference?: string
}

/**
 * Marca una orden como pagada. Esto cierra el ciclo runtime de la order
 * desde la perspectiva de Payment Orders. La conciliacion bancaria
 * (matching contra extracto) sigue siendo responsabilidad del modulo
 * Finance > Reconciliation (TASK-722).
 *
 * Estados validos de partida: `submitted` (path canonico).
 *
 * Nota V1: este helper marca la order y sus lines, y mueve las
 * obligations a 'paid'. NO crea automaticamente expense_payments —
 * eso queda en V2 cuando integremos con el motor de reconciliation
 * (TASK-751). En V1 el operador registra el pago en Finance > Bank
 * por separado y manualmente vincula al order via metadata.
 */
export async function markPaymentOrderPaid(
  input: MarkPaymentOrderPaidInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.paidBy) throw new PaymentOrderValidationError('paidBy requerido')

  const run = async (c: PoolClient) => {
    const current = await c.query<OrderRow>(
      `SELECT * FROM greenhouse_finance.payment_orders
        WHERE order_id = $1
        FOR UPDATE`,
      [input.orderId]
    )

    if ((current.rowCount ?? 0) === 0) {
      throw new PaymentOrderValidationError(`Order ${input.orderId} no existe`, 'not_found', 404)
    }

    const row = current.rows[0]

    if (row.state !== 'submitted') {
      throw new PaymentOrderConflictError(
        `Solo se puede marcar como pagada desde 'submitted'. Estado actual: ${row.state}`,
        'invalid_state'
      )
    }

    const updated = await c.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'paid',
              paid_at = COALESCE($2::timestamptz, now()),
              external_reference = COALESCE($3, external_reference),
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.paidAt ?? null, input.externalReference ?? null]
    )

    // Lines → paid
    const linesResult = await c.query<{ obligation_id: string }>(
      `UPDATE greenhouse_finance.payment_order_lines
          SET state = 'paid', updated_at = now()
        WHERE order_id = $1
          AND state IN ('pending', 'submitted')
        RETURNING obligation_id`,
      [input.orderId]
    )

    // Obligations → paid (solo si la line cerro el monto completo de la obligation)
    if (linesResult.rows.length > 0) {
      await c.query(
        `UPDATE greenhouse_finance.payment_obligations o
            SET status = 'paid', updated_at = now()
          WHERE o.obligation_id = ANY($1::text[])
            AND NOT EXISTS (
              SELECT 1 FROM greenhouse_finance.payment_order_lines l
               WHERE l.obligation_id = o.obligation_id
                 AND l.state NOT IN ('paid', 'cancelled', 'failed')
            )
            AND o.status = 'scheduled'`,
        [linesResult.rows.map(r => r.obligation_id)]
      )
    }

    const order = mapOrderRow(updated.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.paid',
        payload: {
          orderId: order.orderId,
          paidBy: input.paidBy,
          paidAt: order.paidAt,
          totalAmount: order.totalAmount,
          currency: order.currency,
          externalReference: input.externalReference
        }
      },
      c
    )

    return { order, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
