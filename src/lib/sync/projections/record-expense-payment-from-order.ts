import 'server-only'

import { recordPaymentForOrder } from '@/lib/finance/payment-orders/record-payment-from-order'

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
 *   - V1 solo procesa employee_net_pay payroll; otros kinds son skipped
 *     con reason claro (operator path legacy)
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

    const result = await recordPaymentForOrder({ orderId })

    return `recorded=${result.recordedExpensePayments.length} skipped=${result.skipped.length}`
  },
  maxRetries: 2
}
