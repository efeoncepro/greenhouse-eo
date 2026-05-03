import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { query } from '@/lib/db'
import { sendPayslipCommittedNotification } from '@/lib/payroll/send-payslip-lifecycle-notification'
import { getPaymentDeliveryMode } from '@/lib/payroll/payslip-delivery-mode'

interface OrderRow extends Record<string, unknown> {
  order_id: string
  scheduled_for: string | null
  processor_slug: string | null
}

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
 * TASK-759b — Reactive consumer del evento `finance.payment_order.approved`.
 *
 * Cuando una orden se aprueba (maker-checker pass), notifica al colaborador
 * que su pago está programado: "Tu pago de mayo está aprobado, llega el X de
 * mayo via Deel/Banco". Sin PDF — la promesa es informativa.
 *
 * Idempotency natural por `payslip_deliveries` partial unique index
 * `(entry_id, kind='payment_committed')` — re-procesar el mismo evento NO
 * duplica el envío.
 *
 * Anti-rotura: solo activo cuando `GREENHOUSE_PAYSLIP_DELIVERY_MODE` es
 * `'on_payment_paid'` o `'both'` (i.e. el split lifecycle está activo).
 * En modo legacy, queda no-op.
 */
export const payslipOnPaymentApprovedProjection: ProjectionDefinition = {
  name: 'payslip_on_payment_approved',
  description: 'Send committed-promise notification when treasury approves a payroll payment_order (TASK-759b)',
  domain: 'notifications',

  triggerEvents: ['finance.payment_order.approved'],

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
    const triggeredByUserId = typeof payload.approvedBy === 'string' ? payload.approvedBy : null

    // Cargar orden para obtener scheduledFor + processor.
    const [order] = await query<OrderRow>(
      `SELECT order_id, scheduled_for::text AS scheduled_for, processor_slug
         FROM greenhouse_finance.payment_orders
        WHERE order_id = $1`,
      [orderId]
    )

    if (!order) return `order ${orderId} not found`

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
      return `no payroll net_pay lines on order ${orderId} (mode=${mode})`
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
        errors.push(`line ${line.line_id} missing payrollEntryId`)
        continue
      }

      const result = await sendPayslipCommittedNotification({
        entryId,
        paymentOrderId: orderId,
        paymentOrderLineId: line.line_id,
        scheduledFor: order.scheduled_for,
        processorSlug: order.processor_slug,
        sourceEventId,
        triggeredByUserId
      })

      if (result.status === 'sent') sent += 1
      else if (result.status.startsWith('skipped')) skipped += 1
      else {
        failed += 1
        if ('error' in result) errors.push(`entry ${entryId}: ${result.error}`)
      }
    }

    const summary = `committed promise on order ${orderId} (mode=${mode}): sent=${sent} skipped=${skipped} failed=${failed}`

    if (failed > 0 && sent === 0) {
      throw new Error(`${summary} | ${errors.slice(0, 3).join(' | ')}`)
    }

    return summary
  },

  maxRetries: 2
}
