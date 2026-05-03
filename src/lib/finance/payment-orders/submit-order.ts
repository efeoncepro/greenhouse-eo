import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'

export interface SubmitPaymentOrderInput {
  orderId: string
  submittedBy: string
  externalReference?: string
}

/**
 * Marca una orden como enviada al banco/processor. Solo desde estados
 * `approved` o `scheduled`. La submission es manual en V1 (operador
 * sube CSV al banco, registra el numero de operacion aqui).
 */
export async function submitPaymentOrder(
  input: SubmitPaymentOrderInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.submittedBy) throw new PaymentOrderValidationError('submittedBy requerido')

  const validStates = new Set(['approved', 'scheduled'])

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

    if (!validStates.has(row.state)) {
      throw new PaymentOrderConflictError(
        `Solo se puede marcar como enviada desde 'approved' o 'scheduled'. Estado actual: ${row.state}`,
        'invalid_state'
      )
    }

    const updated = await c.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'submitted',
              submitted_at = now(),
              external_reference = COALESCE($2, external_reference),
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.externalReference ?? null]
    )

    // Lines tambien pasan a 'submitted'
    await c.query(
      `UPDATE greenhouse_finance.payment_order_lines
          SET state = 'submitted', updated_at = now()
        WHERE order_id = $1
          AND state = 'pending'`,
      [input.orderId]
    )

    const order = mapOrderRow(updated.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.submitted',
        payload: {
          orderId: order.orderId,
          submittedBy: input.submittedBy,
          externalReference: input.externalReference,
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
