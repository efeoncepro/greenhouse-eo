import 'server-only'

import {
  listPayableIdsByPaymentOrderForPaidCascade,
  markPayablePaid
} from '@/lib/contractor-engagements/payables/store'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

const CASCADE_ACTOR = 'system:contractor-payable-paid-cascade'

const extractOrderId = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.orderId === 'string' && payload.orderId.length > 0) return payload.orderId
  if (typeof payload.order_id === 'string' && payload.order_id.length > 0) return payload.order_id

  return null
}

const extractPaidAt = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.paidAt === 'string' && payload.paidAt.length > 0) return payload.paidAt
  if (typeof payload.paid_at === 'string' && payload.paid_at.length > 0) return payload.paid_at

  return null
}

/**
 * TASK-981 Slice 1 — cascade `finance.payment_order.paid → contractor payable paid`.
 *
 * Cierra el tramo final del lifecycle del contractor payable. Cuando Tesorería marca
 * la payment order como `paid` (settlement TASK-765/977), esta projection encuentra
 * los contractor payables enlazados a esa orden que siguen en `payment_order_created`
 * y los transiciona a `paid` vía el writer canonical `markPayablePaid`, que emite el
 * evento de dominio `workforce.contractor_payable.paid v1` por payable. Ese evento
 * dispara el envío del comprobante TASK-960 (consumer `contractor-payable-paid-email`).
 *
 * Antes de TASK-981 ningún consumer de `finance.payment_order.paid` tocaba los
 * contractor payables (los dos existentes — record-expense-payment-from-order y
 * payslip-on-payment-paid — son ajenos), así que el payable nunca llegaba a `paid`.
 *
 * Idempotente + decoupled:
 *  - el reader filtra `status='payment_order_created'` en SQL → órdenes no-contractor
 *    o payables ya pagados producen 0 filas (no-op limpio para órdenes ajenas)
 *  - markPayablePaid es no-op si el payable ya está `paid` (no re-emite el evento)
 *  - un payable que falla NO bloquea a los demás de la misma orden (se acumula y se
 *    re-lanza al final para que el dispatcher reintente la orden completa)
 */
export const contractorPayablePaidCascadeProjection: ProjectionDefinition = {
  name: 'contractor_payable_paid_cascade',
  description:
    'Transition linked contractor payables to paid when their payment order is marked paid (TASK-981).',
  domain: 'finance',
  triggerEvents: ['finance.payment_order.paid'],
  extractScope: payload => {
    const orderId = extractOrderId(payload)

    if (!orderId) return null

    return { entityType: 'payment_order', entityId: orderId }
  },
  refresh: async (scope, payload) => {
    const orderId = scope.entityId
    const paidAt = extractPaidAt(payload)

    const payableIds = await listPayableIdsByPaymentOrderForPaidCascade(orderId)

    if (payableIds.length === 0) {
      return `payment_order ${orderId}: no contractor payables in payment_order_created; skipped`
    }

    let paid = 0
    const failures: string[] = []

    for (const contractorPayableId of payableIds) {
      try {
        await markPayablePaid({
          contractorPayableId,
          actorUserId: CASCADE_ACTOR,
          paidAt,
          paymentOrderId: orderId
        })
        paid += 1
      } catch (err) {
        failures.push(contractorPayableId)
        captureWithDomain(err, 'finance', {
          tags: { source: 'contractor_payable_paid_cascade' },
          extra: { orderId, contractorPayableId }
        })
      }
    }

    if (failures.length > 0) {
      // Re-throw so the dispatcher retries the whole order; payables already paid
      // become no-ops on retry (markPayablePaid is idempotent).
      throw new Error(
        `payment_order ${orderId}: ${paid} payable(s) paid, ${failures.length} failed (${failures.join(', ')})`
      )
    }

    return `payment_order ${orderId} → ${paid} contractor payable(s) marked paid`
  },
  maxRetries: 5
}
