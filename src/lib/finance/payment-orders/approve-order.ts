import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'

export interface ApprovePaymentOrderInput {
  orderId: string
  approvedBy: string
}

/**
 * Aprueba una orden en `pending_approval`. Maker-checker:
 * `approved_by != created_by` cuando require_approval=TRUE (defense in
 * depth: trigger DB tambien valida).
 *
 * Estados validos de partida: `pending_approval`. Cualquier otro estado
 * lanza conflict.
 */
export async function approvePaymentOrder(
  input: ApprovePaymentOrderInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.approvedBy) throw new PaymentOrderValidationError('approvedBy requerido')

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

    if (row.state !== 'pending_approval') {
      throw new PaymentOrderConflictError(
        `Solo se puede aprobar desde 'pending_approval', estado actual: ${row.state}`,
        'invalid_state'
      )
    }

    if (row.require_approval && row.created_by === input.approvedBy) {
      throw new PaymentOrderConflictError(
        `Maker-checker: el creador (${row.created_by}) no puede aprobar su propia orden`,
        'maker_checker_violation',
        403
      )
    }

    const updated = await c.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'approved',
              approved_by = $2,
              approved_at = now(),
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.approvedBy]
    )

    const order = mapOrderRow(updated.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.approved',
        payload: {
          orderId: order.orderId,
          approvedBy: input.approvedBy,
          totalAmount: order.totalAmount,
          currency: order.currency
        }
      },
      c
    )

    return { order, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
