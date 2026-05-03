import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { query } from '@/lib/db'
import { sendPayslipForEntry } from '@/lib/payroll/send-payslip-for-entry'
import { getPaymentDeliveryMode } from '@/lib/payroll/payslip-delivery-mode'
import { captureWithDomain } from '@/lib/observability/capture'

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

/**
 * TASK-759 — Reactive consumer del evento `finance.payment_order.paid`.
 *
 * Cuando Tesorería marca una orden como pagada, esta projection itera
 * cada `payment_order_line` con `obligation_kind='employee_net_pay'` y
 * `source_kind='payroll'`, resuelve el `payrollEntryId` desde el metadata
 * de la obligation, y dispara el envío del recibo individual al colaborador
 * con `delivery_trigger='payment_paid'`.
 *
 * Idempotencia: el helper `sendPayslipForEntry` chequea `(entry_id, revision)`
 * y skip-ea si ya hay status='email_sent'. Si el legacy export ya envió,
 * este path no duplica.
 *
 * Feature flag: respeta `GREENHOUSE_PAYSLIP_DELIVERY_MODE`. En modo
 * `'legacy_export'` (default), esta projection NO envía nada — es no-op.
 * En `'on_payment_paid'` o `'both'`, envía y persiste audit.
 */
export const payslipOnPaymentPaidProjection: ProjectionDefinition = {
  name: 'payslip_on_payment_paid',
  description: 'Send payroll payslip individually when its payment_order is marked paid (TASK-759)',
  domain: 'notifications',

  triggerEvents: ['finance.payment_order.paid'],

  extractScope: (payload) => {
    const orderId = extractOrderId(payload)

    if (!orderId) return null

    return { entityType: 'payment_order', entityId: orderId }
  },

  refresh: async (scope, payload) => {
    const mode = getPaymentDeliveryMode()

    if (mode === 'legacy_export') {
      return null
    }

    const orderId = scope.entityId
    const sourceEventId = typeof payload._eventId === 'string' ? payload._eventId : null

    const lines = await query<OrderLineRow>(
      `SELECT pol.line_id,
              pol.obligation_id,
              po_obl.obligation_kind,
              po_obl.source_kind,
              po_obl.metadata_json
         FROM greenhouse_finance.payment_order_lines AS pol
         INNER JOIN greenhouse_finance.payment_obligations AS po_obl
           ON po_obl.obligation_id = pol.obligation_id
        WHERE pol.order_id = $1
          AND pol.state = 'paid'
          AND po_obl.source_kind = 'payroll'
          AND po_obl.obligation_kind = 'employee_net_pay'`,
      [orderId]
    )

    if (lines.length === 0) {
      return `no payslip-eligible lines on order ${orderId} (mode=${mode})`
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const line of lines) {
      const meta = line.metadata_json ?? {}
      const entryId = typeof meta.payrollEntryId === 'string' ? meta.payrollEntryId : null

      if (!entryId) {
        failed += 1
        errors.push(`line ${line.line_id} has no payrollEntryId in obligation metadata`)
        continue
      }

      try {
        const result = await sendPayslipForEntry({
          entryId,
          trigger: 'payment_paid',
          paymentOrderLineId: line.line_id,
          sourceEventId
        })

        if (result.status === 'sent') sent += 1
        else if (result.status === 'skipped_already_sent' || result.status === 'skipped_no_email') skipped += 1
        else {
          failed += 1
          errors.push(`entry ${entryId}: ${result.status} ${result.error ?? ''}`)
        }
      } catch (e) {
        failed += 1
        errors.push(`entry ${entryId}: ${e instanceof Error ? e.message : String(e)}`)
        captureWithDomain(e, 'payroll', {
          tags: { feature: 'payslip_lifecycle', kind: 'payment_paid' },
          extra: { entryId, orderId, lineId: line.line_id }
        })
      }
    }

    const summary = `payslip dispatch on order ${orderId} (mode=${mode}): sent=${sent} skipped=${skipped} failed=${failed}`

    if (failed > 0 && sent === 0) {
      // All-failure: throw to let reactive consumer retry. Errors logged.
      throw new Error(`${summary} | errors: ${errors.slice(0, 3).join(' | ')}`)
    }

    return summary
  },

  maxRetries: 2
}
