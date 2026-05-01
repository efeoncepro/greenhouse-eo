import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { query } from '@/lib/db'
import { sendPayslipCancelledNotification } from '@/lib/payroll/send-payslip-lifecycle-notification'
import { getPaymentDeliveryMode } from '@/lib/payroll/payslip-delivery-mode'

interface OrderLineRow extends Record<string, unknown> {
  line_id: string
  obligation_id: string
  obligation_kind: string
  source_kind: string
  metadata_json: Record<string, unknown> | null
}

const extractOrderId = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.orderId === 'string' && payload.orderId.length > 0) return payload.orderId
  if (typeof payload.order_id === 'string' && payload.order_id.length > 0) return payload.order_id

  return null
}

const extractReason = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.reason === 'string' && payload.reason.length > 0) return payload.reason
  if (typeof payload.cancelledReason === 'string' && payload.cancelledReason.length > 0) return payload.cancelledReason

  return null
}

/**
 * TASK-759c — Reactive consumer del evento `finance.payment_order.cancelled`.
 *
 * Cuando se cancela una orden, compensar al colaborador con un mensaje calmo:
 * "Detectamos un problema con el pago programado. Lo estamos resolviendo."
 *
 * Anti-rotura: NUNCA se envía si el colaborador ya recibió el `payment_paid`
 * (significa que el dinero ya salió — eso requiere reliquidation_delta separada).
 * El helper `sendPayslipCancelledNotification` aplica este guard internamente.
 *
 * Bonus: hace supersede de la `payment_committed` previa (esa promesa ya no aplica).
 */
export const payslipOnPaymentCancelledProjection: ProjectionDefinition = {
  name: 'payslip_on_payment_cancelled',
  description: 'Send compensation notification when a payroll payment_order is cancelled (TASK-759c)',
  domain: 'notifications',

  triggerEvents: ['finance.payment_order.cancelled'],

  extractScope: (payload) => {
    const orderId = extractOrderId(payload)

    if (!orderId) return null

    return { entityType: 'payment_order', entityId: orderId }
  },

  refresh: async (scope, payload) => {
    const mode = getPaymentDeliveryMode()

    if (mode === 'legacy_export') {
      return null  // No-op en legacy.
    }

    const orderId = scope.entityId
    const sourceEventId = typeof payload._eventId === 'string' ? payload._eventId : null
    const triggeredByUserId = typeof payload.cancelledBy === 'string' ? payload.cancelledBy : null
    const reason = extractReason(payload)

    const lines = await query<OrderLineRow>(
      `SELECT pol.line_id, pol.obligation_id,
              pob.obligation_kind, pob.source_kind, pob.metadata_json
         FROM greenhouse_finance.payment_order_lines pol
         INNER JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
        WHERE pol.order_id = $1
          AND pob.source_kind = 'payroll'
          AND pob.obligation_kind = 'employee_net_pay'`,
      [orderId]
    )

    if (lines.length === 0) {
      return `no payroll net_pay lines on cancelled order ${orderId} (mode=${mode})`
    }

    let sent = 0
    let skipped = 0
    let blocked = 0
    let failed = 0
    const errors: string[] = []

    for (const line of lines) {
      const meta = line.metadata_json ?? {}
      const entryId = typeof meta.payrollEntryId === 'string' ? meta.payrollEntryId : null

      if (!entryId) {
        failed += 1
        errors.push(`line ${line.line_id} missing payrollEntryId`)
        continue
      }

      const result = await sendPayslipCancelledNotification({
        entryId,
        paymentOrderId: orderId,
        paymentOrderLineId: line.line_id,
        cancellationReason: reason,
        sourceEventId,
        triggeredByUserId
      })

      if (result.status === 'sent') sent += 1
      else if (result.status === 'skipped_blocked_by_paid') blocked += 1
      else if (result.status.startsWith('skipped')) skipped += 1
      else {
        failed += 1
        if ('error' in result) errors.push(`entry ${entryId}: ${result.error}`)
      }
    }

    const summary = `cancellation compensation on order ${orderId} (mode=${mode}): sent=${sent} skipped=${skipped} blocked_by_paid=${blocked} failed=${failed}`

    if (failed > 0 && sent === 0 && blocked === 0) {
      throw new Error(`${summary} | ${errors.slice(0, 3).join(' | ')}`)
    }

    return summary
  },

  maxRetries: 2
}
