import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { markPaymentOrderPaid } from '@/lib/finance/payment-orders/mark-paid'
import {
  PaymentOrderConflictError,
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderMissingSourceAccountError,
  PaymentOrderSettlementBlockedError,
  PaymentOrderValidationError
} from '@/lib/finance/payment-orders/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const body = await request.json().catch(() => ({}))

    const result = await markPaymentOrderPaid({
      orderId,
      paidBy: tenant.userId,
      paidAt: body?.paidAt || undefined,
      externalReference: body?.externalReference || undefined
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId })
  } catch (error) {
    // TASK-765: errores tipados del path atomico (slice 5).
    // - source_account_required (slice 1): 422
    // - settlement_blocked (slice 4/5): 422 con reason estructurada
    // - expense_unresolved (slice 4): 422
    // - conflict / validation: 409 / 400
    if (
      error instanceof PaymentOrderMissingSourceAccountError ||
      error instanceof PaymentOrderSettlementBlockedError ||
      error instanceof PaymentOrderExpenseUnresolvedError ||
      error instanceof PaymentOrderValidationError ||
      error instanceof PaymentOrderConflictError
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`POST mark-paid order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible marcar la orden como pagada.' },
      { status: 500 }
    )
  }
}
