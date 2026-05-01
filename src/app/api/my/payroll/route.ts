import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonFinanceOverviewFromPostgres } from '@/lib/person-360/get-person-finance'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface PaymentStatusRow extends Record<string, unknown> {
  entry_id: string
  order_id: string | null
  order_state: string | null
  order_title: string | null
  processor_slug: string | null
  scheduled_for: string | null
  paid_at: string | null
  external_reference: string | null
}

interface PayslipDeliveryRow extends Record<string, unknown> {
  entry_id: string
  delivery_kind: string
  status: string
  email_recipient: string | null
  email_provider_id: string | null
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
  superseded_by: string | null
  created_at: string
}

/**
 * TASK-759e — Extiende `/api/my/payroll` con estado de pago + payslip
 * delivery timeline per entry. Reusa el endpoint canónico (NO crea ruta
 * paralela en /me/payments). Filtra estricto por session.member_id.
 */
export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const overview = await getPersonFinanceOverviewFromPostgres(memberId)
    const history = overview?.payrollHistory ?? []
    const entryIds = history.map(h => h.entryId)

    const paymentStatusByEntry: Record<string, PaymentStatusRow> = {}
    const deliveriesByEntry: Record<string, PayslipDeliveryRow[]> = {}

    if (entryIds.length > 0) {
      // 1. Payment order status linked via obligation.metadataJson.payrollEntryId
      //    Resolve the obligation linked to each entry, then the active line, then the order.
      const paymentRows = await query<PaymentStatusRow>(
        `SELECT (pob.metadata_json->>'payrollEntryId') AS entry_id,
                po.order_id, po.state AS order_state, po.title AS order_title,
                po.processor_slug, po.scheduled_for::text AS scheduled_for,
                po.paid_at::text AS paid_at, po.external_reference
           FROM greenhouse_finance.payment_obligations pob
           LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.obligation_id = pob.obligation_id
           LEFT JOIN greenhouse_finance.payment_orders po ON po.order_id = pol.order_id
          WHERE pob.source_kind = 'payroll'
            AND pob.obligation_kind = 'employee_net_pay'
            AND pob.metadata_json->>'payrollEntryId' = ANY($1::text[])
            AND (po.state IS NULL OR po.state NOT IN ('cancelled'))`,
        [entryIds]
      )

      for (const row of paymentRows) {
        if (row.entry_id) paymentStatusByEntry[row.entry_id] = row
      }

      // 2. Payslip deliveries timeline per entry
      const deliveryRows = await query<PayslipDeliveryRow>(
        `SELECT entry_id, delivery_kind, status, email_recipient,
                email_provider_id, sent_at::text AS sent_at,
                failed_at::text AS failed_at, error_message,
                superseded_by, created_at::text AS created_at
           FROM greenhouse_payroll.payslip_deliveries
          WHERE entry_id = ANY($1::text[])
          ORDER BY created_at ASC`,
        [entryIds]
      )

      for (const row of deliveryRows) {
        if (!deliveriesByEntry[row.entry_id]) deliveriesByEntry[row.entry_id] = []
        deliveriesByEntry[row.entry_id].push(row)
      }
    }

    const enrichedHistory = history.map(entry => {
      const payment = paymentStatusByEntry[entry.entryId]
      const deliveries = deliveriesByEntry[entry.entryId] ?? []
      const lastDelivered = deliveries.filter(d => d.status === 'sent').slice(-1)[0]

      return {
        ...entry,
        // Payment lifecycle status (for the new "Estado pago" column)
        paymentStatus: derivePaymentStatus(payment, deliveries),
        paymentOrder: payment?.order_id
          ? {
              orderId: payment.order_id,
              title: payment.order_title,
              state: payment.order_state,
              processorSlug: payment.processor_slug,
              scheduledFor: payment.scheduled_for,
              paidAt: payment.paid_at,
              externalReference: payment.external_reference
            }
          : null,
        // Delivery summary for the table (last status sent)
        payslipDelivery: lastDelivered
          ? {
              deliveryKind: lastDelivered.delivery_kind,
              status: lastDelivered.status,
              sentAt: lastDelivered.sent_at,
              emailProviderId: lastDelivered.email_provider_id,
              emailRecipient: lastDelivered.email_recipient
            }
          : null,
        // Full timeline for the drawer
        payslipDeliveryTimeline: deliveries.map(d => ({
          deliveryKind: d.delivery_kind,
          status: d.status,
          sentAt: d.sent_at,
          failedAt: d.failed_at,
          errorMessage: d.error_message,
          emailProviderId: d.email_provider_id,
          superseded: d.superseded_by !== null,
          createdAt: d.created_at
        }))
      }
    })

    return NextResponse.json({
      payrollHistory: enrichedHistory,
      compensation: overview?.summary ?? null,
      memberId
    })
  } catch (error) {
    console.error('GET /api/my/payroll failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Deriva el estado del pago a partir de la orden y los deliveries.
 * - 'no_obligation' — no hay payment_obligation aún
 * - 'awaiting_order' — obligation existe pero ninguna order
 * - 'order_pending' — order en draft/pending_approval
 * - 'order_approved' — committed (orden aprobada, esperando ejecución)
 * - 'order_paid' — order pagada, recibo posiblemente enviado
 * - 'cancelled' — orden cancelada
 */
function derivePaymentStatus(
  payment: PaymentStatusRow | undefined,
  deliveries: PayslipDeliveryRow[]
): string {
  if (!payment || !payment.order_id) return 'awaiting_order'
  if (payment.order_state === 'cancelled') return 'cancelled'

  if (payment.order_state === 'paid' || payment.order_state === 'settled' || payment.order_state === 'closed') {
    return 'order_paid'
  }

  if (payment.order_state === 'approved' || payment.order_state === 'scheduled' || payment.order_state === 'submitted') {
    const hasCommitted = deliveries.some(d => d.delivery_kind === 'payment_committed' && d.status === 'sent' && !d.superseded_by)

    return hasCommitted ? 'order_approved' : 'order_pending'
  }

  return 'order_pending'
}
