import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { sendPayslipForEntry } from '@/lib/payroll/send-payslip-for-entry'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'

export const dynamic = 'force-dynamic'

interface OrderLineRow extends Record<string, unknown> {
  line_id: string
  obligation_id: string
  obligation_kind: string
  source_kind: string
  state: string
  metadata_json: Record<string, unknown> | null
  beneficiary_name: string | null
}

/**
 * TASK-759 — Manual resend de recibos de nómina ligados a una orden.
 *
 * Caso de uso: el path automático (projection payslip_on_payment_paid) falló
 * o necesita re-enviarse por ajuste de datos. Este endpoint dispara
 * `sendPayslipForEntry({trigger:'manual_resend'})` para cada line con
 * obligation_kind='employee_net_pay' de la orden.
 *
 * Honra idempotency: si ya hay receipt con status='email_sent', skip.
 * Para forzar reenvío, usar `?force=true` que resetea el receipt a
 * status='generated' antes del envío (audit-preserved).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TASK-759d — Capability gate fina (en addición a finance route_group).
  if (!can(tenant, 'finance.payslip.resend', 'update', 'tenant')) {
    return NextResponse.json(
      { error: 'No tienes permisos para reenviar recibos. Requiere finance.payslip.resend.' },
      { status: 403 }
    )
  }

  const { orderId } = await params

  if (!orderId) {
    return NextResponse.json({ error: 'orderId requerido' }, { status: 400 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get('force') === 'true'

  const lines = await query<OrderLineRow>(
    `SELECT pol.line_id, pol.obligation_id, pol.state,
            pob.obligation_kind, pob.source_kind, pob.metadata_json, pob.beneficiary_name
       FROM greenhouse_finance.payment_order_lines pol
       INNER JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
      WHERE pol.order_id = $1
        AND pob.source_kind = 'payroll'
        AND pob.obligation_kind = 'employee_net_pay'`,
    [orderId]
  )

  if (lines.length === 0) {
    return NextResponse.json({
      orderId,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: [],
      message: 'No employee_net_pay payroll lines on this order'
    })
  }

  const results: Array<{
    lineId: string
    beneficiary: string | null
    status: string
    receiptId: string | null
    resendId: string | null
    error: string | null
  }> = []

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const line of lines) {
    const meta = line.metadata_json ?? {}
    const entryId = typeof meta.payrollEntryId === 'string' ? meta.payrollEntryId : null

    if (!entryId) {
      failed += 1
      results.push({
        lineId: line.line_id,
        beneficiary: line.beneficiary_name,
        status: 'failed',
        receiptId: null,
        resendId: null,
        error: 'no payrollEntryId in obligation metadata'
      })
      continue
    }

    if (force) {
      // Reset receipt status para bypass del idempotency check.
      await query(
        `UPDATE greenhouse_payroll.payroll_receipts
            SET status = 'generated', email_sent_at = NULL, email_delivery_id = NULL
          WHERE entry_id = $1
            AND status = 'email_sent'`,
        [entryId]
      )
    }

    try {
      const result = await sendPayslipForEntry({
        entryId,
        trigger: 'manual_resend',
        paymentOrderLineId: line.line_id,
        actorEmail: tenant.userId
      })

      if (result.status === 'sent') sent += 1
      else if (result.status === 'skipped_already_sent' || result.status === 'skipped_no_email') skipped += 1
      else failed += 1

      results.push({
        lineId: line.line_id,
        beneficiary: line.beneficiary_name,
        status: result.status,
        receiptId: result.receiptId,
        resendId: result.resendId,
        error: result.error
      })
    } catch (e) {
      failed += 1
      results.push({
        lineId: line.line_id,
        beneficiary: line.beneficiary_name,
        status: 'failed',
        receiptId: null,
        resendId: null,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  return NextResponse.json({ orderId, force, sent, skipped, failed, results })
}
