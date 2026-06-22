import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import { schedulePaymentOrder } from '@/lib/finance/payment-orders/schedule-order'
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

  // TASK-1192 — gate fino de acción (capability != route-group).
  if (!can(tenant, 'finance.payment_orders.schedule', 'update', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para programar órdenes de pago.', code: 'forbidden' }, { status: 403 })
  }

  const { orderId } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const scheduledFor = body?.scheduledFor

    if (!scheduledFor || typeof scheduledFor !== 'string') {
      return NextResponse.json(
        { error: 'scheduledFor (YYYY-MM-DD) es requerido' },
        { status: 400 }
      )
    }

    const result = await schedulePaymentOrder({
      orderId,
      scheduledFor,
      scheduledBy: tenant.userId
    })

    return NextResponse.json({ order: result.order, eventId: result.eventId })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`POST schedule order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible programar la orden.' },
      { status: 500 }
    )
  }
}
