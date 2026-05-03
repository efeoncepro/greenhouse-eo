import 'server-only'

import { recordPaymentForOrder } from '@/lib/finance/payment-orders/record-payment-from-order'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-751 — Cierra el ciclo `payment_order.paid → expense_payment +
 * settlement_leg + reconciliation ready`. Cuando una payment_order
 * (TASK-750) pasa a `state='paid'`, este projection itera sus lines
 * payroll y crea expense_payments via recordExpensePayment().
 *
 * Idempotente:
 *   - el partial unique index sobre payment_order_lines.expense_payment_id
 *     (migration TASK-751) evita duplicar
 *   - cada line se chequea: si ya tiene expense_payment_id, se skipea
 *
 * **TASK-765 Slice 4 — loud, no silencioso.**
 *
 * Cuando el resolver no puede crear el expense_payment (expense_not_found,
 * out_of_scope_v1, materializer dead-letter, CHECK violation), throw
 * propaga al reactive worker, que rutea a `failed` y luego `dead-letter`
 * segun retry policy. Antes del re-throw, `captureWithDomain` registra
 * el error en Sentry con `domain=finance` y `source=payment_order_settlement`
 * para que el subsystem rolle al rollup canonico.
 */
export const recordExpensePaymentFromOrderProjection: ProjectionDefinition = {
  name: 'record_expense_payment_from_order',
  description:
    'TASK-751 - cuando una payment_order pasa a paid, registra expense_payments por cada line payroll',
  domain: 'finance',
  triggerEvents: ['finance.payment_order.paid'],
  extractScope: payload => {
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : null

    if (!orderId) return null

    return {
      entityType: 'payment_order',
      entityId: orderId
    }
  },
  refresh: async scope => {
    const orderId = scope.entityId

    try {
      const result = await recordPaymentForOrder({ orderId })

      return `recorded=${result.recordedExpensePayments.length} skipped=${result.skipped.length}`
    } catch (err) {
      captureWithDomain(err, 'finance', {
        tags: { source: 'payment_order_settlement', orderId }
      })

      throw err
    }
  },
  maxRetries: 2
}
