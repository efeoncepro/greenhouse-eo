import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { submitPaymentOrder } from '@/lib/finance/payment-orders/submit-order'
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

    const result = await submitPaymentOrder({
      orderId,
      submittedBy: tenant.userId,
      externalReference: body?.externalReference || undefined
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`POST submit order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible marcar la orden como enviada.' },
      { status: 500 }
    )
  }
}
