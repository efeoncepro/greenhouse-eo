import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { PaymentOrder } from '@/types/payment-orders'

import { PaymentOrderConflictError, PaymentOrderValidationError } from './errors'
import { markPaymentOrderPaidAtomic } from './mark-paid-atomic'
import { mapOrderRow, type OrderRow } from './row-mapper'
import { recordPaymentOrderStateTransition } from './state-transitions-audit'
import { assertSourceAccountForPaid } from './transitions'

export interface MarkPaymentOrderPaidInput {
  orderId: string
  paidBy: string
  paidAt?: string
  externalReference?: string
}

/**
 * Marca una orden como pagada y dispara el chain downstream completo
 * (expense_payment + settlement_leg + account_balances rematerialization)
 * dentro de una sola transaccion atomica (TASK-765 Slice 5).
 *
 * **Comportamiento canonico (sin client):** delega a
 * `markPaymentOrderPaidAtomic`. Garantia ACID: si cualquier step falla,
 * ROLLBACK completo y la order vuelve a `submitted`. Banco intacto si la
 * tx no commitea, banco actualizado si commitea — nunca a medio camino.
 *
 * **Comportamiento legacy (con client externo):** preserva el body V1
 * (UPDATE + audit log + outbox, sin per-line settlement) para callers que
 * orquestan su propia tx mas grande. El proyector reactivo
 * `record_expense_payment_from_order` actua como safety net en este caso.
 *
 * Estados validos de partida: `submitted`.
 */
export async function markPaymentOrderPaid(
  input: MarkPaymentOrderPaidInput,
  client?: PoolClient
): Promise<{ order: PaymentOrder; eventId: string }> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.paidBy) throw new PaymentOrderValidationError('paidBy requerido')

  // Path canonico (slice 5): atomic chain completo.
  if (!client) {
    const result = await markPaymentOrderPaidAtomic(input)

    return { order: result.order, eventId: result.eventId }
  }

  // Path legacy: caller orquesta la tx, este helper solo hace state
  // transition + audit + outbox. El safety net (proyector reactivo) cubre
  // el chain downstream.
  const c = client

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
      'invalid_state_transition'
    )
  }

  assertSourceAccountForPaid(input.orderId, row.source_account_id, 'paid')

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

  const linesResult = await c.query<{ obligation_id: string }>(
    `UPDATE greenhouse_finance.payment_order_lines
        SET state = 'paid', updated_at = now()
      WHERE order_id = $1
        AND state IN ('pending', 'submitted')
      RETURNING obligation_id`,
    [input.orderId]
  )

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

  await recordPaymentOrderStateTransition(
    {
      orderId: order.orderId,
      fromState: 'submitted',
      toState: 'paid',
      actorUserId: input.paidBy,
      reason: 'mark_paid_legacy_with_external_client',
      metadata: {
        externalReference: input.externalReference ?? null,
        sourceAccountId: order.sourceAccountId ?? null,
        path: 'legacy_external_client'
      }
    },
    c
  )

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

  // Hint a typescript que `withTransaction` no está sin usar (se reserva
  // para callers futuros que prefieran abrir una tx manual).
  void withTransaction

  return { order, eventId }
}
