import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { approvePaymentOrder } from '@/lib/finance/payment-orders/approve-order'
import {
  PaymentOrderConflictError,
  PaymentOrderValidationError
} from '@/lib/finance/payment-orders/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const result = await approvePaymentOrder({
      orderId,
      approvedBy: tenant.userId
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`POST approve order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible aprobar la orden.' },
      { status: 500 }
    )
  }
}
