import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'

export interface CancelPaymentOrderInput {
  orderId: string
  cancelledBy: string
  reason: string
}

/**
 * Cancela una orden y libera las obligations lockeadas. Estados validos
 * de partida: `draft`, `pending_approval`, `approved`, `scheduled`.
 *
 * Estados terminales (no se cancelan):
 *   - `submitted`: pago en vuelo, hay que esperar resolucion banco
 *   - `paid` / `settled` / `closed`: pago ya ocurrio
 *   - `cancelled` / `failed`: ya cerrada
 *
 * El cancel marca:
 *   - order.state = 'cancelled'
 *   - lines.state = 'cancelled' (libera idempotency lock)
 *   - obligations vuelven a 'generated' (queda libre para nuevas orders)
 */
export async function cancelPaymentOrder(
  input: CancelPaymentOrderInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.cancelledBy) throw new PaymentOrderValidationError('cancelledBy requerido')

  if (!input.reason || input.reason.trim().length < 3) {
    throw new PaymentOrderValidationError('reason debe tener al menos 3 caracteres')
  }

  const cancellableStates = new Set(['draft', 'pending_approval', 'approved', 'scheduled'])

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

    if (!cancellableStates.has(row.state)) {
      throw new PaymentOrderConflictError(
        `No se puede cancelar desde estado ${row.state}. Estados cancelables: ${[...cancellableStates].join(', ')}`,
        'invalid_state'
      )
    }

    // 1. Cancel order
    const updated = await c.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'cancelled',
              cancelled_by = $2,
              cancelled_reason = $3,
              cancelled_at = now(),
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.cancelledBy, input.reason.trim()]
    )

    // 2. Cancel lines (libera idempotency lock)
    const linesResult = await c.query<{ obligation_id: string }>(
      `UPDATE greenhouse_finance.payment_order_lines
          SET state = 'cancelled', updated_at = now()
        WHERE order_id = $1
          AND state NOT IN ('cancelled', 'failed', 'paid')
        RETURNING obligation_id`,
      [input.orderId]
    )

    const obligationIds = linesResult.rows.map(r => r.obligation_id)

    // 3. Restituye obligations a 'generated' si estaban en 'scheduled'
    if (obligationIds.length > 0) {
      await c.query(
        `UPDATE greenhouse_finance.payment_obligations
            SET status = 'generated', updated_at = now()
          WHERE obligation_id = ANY($1::text[])
            AND status = 'scheduled'`,
        [obligationIds]
      )
    }

    const order = mapOrderRow(updated.rows[0])

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.cancelled',
        payload: {
          orderId: order.orderId,
          cancelledBy: input.cancelledBy,
          reason: input.reason.trim(),
          previousState: row.state,
          releasedObligationIds: obligationIds
        }
      },
      c
    )

    return { order, eventId }
  }

  if (client) return run(client)

  return withTransaction(run)
}
