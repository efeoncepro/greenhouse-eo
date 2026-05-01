import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'

export interface SchedulePaymentOrderInput {
  orderId: string
  scheduledFor: string
  scheduledBy: string
}

/**
 * Programa una orden aprobada para una fecha de ejecucion. Solo desde
 * estado `approved`. La fecha es informativa para el calendario, no
 * dispara submission automatica (V1 no orquesta payouts).
 */
export async function schedulePaymentOrder(
  input: SchedulePaymentOrderInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledFor)) {
    throw new PaymentOrderValidationError('scheduledFor debe ser YYYY-MM-DD')
  }

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

    if (row.state !== 'approved' && row.state !== 'scheduled') {
      throw new PaymentOrderConflictError(
        `Solo se puede programar desde 'approved' o re-programar desde 'scheduled'. Estado actual: ${row.state}`,
        'invalid_state'
      )
    }

    const updated = await c.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'scheduled',
              scheduled_for = $2::date,
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.scheduledFor]
    )

    const order = mapOrderRow(updated.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.scheduled',
        payload: {
          orderId: order.orderId,
          scheduledFor: input.scheduledFor,
          scheduledBy: input.scheduledBy
        }
      },
      c
    )

    return { order, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
