import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { cancelPaymentOrder } from '@/lib/finance/payment-orders/cancel-order'
import {
  PaymentOrderConflictError,
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
    const reason = (body?.reason ?? '').toString().trim()

    if (!reason) {
      return NextResponse.json(
        { error: 'reason es requerido' },
        { status: 400 }
      )
    }

    const result = await cancelPaymentOrder({
      orderId,
      cancelledBy: tenant.userId,
      reason
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`POST cancel order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cancelar la orden.' },
      { status: 500 }
    )
  }
}
