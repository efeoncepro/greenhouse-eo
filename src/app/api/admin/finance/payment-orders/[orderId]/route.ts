import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentOrderWithLines } from '@/lib/finance/payment-orders/list-orders'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const order = await getPaymentOrderWithLines(orderId)

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error(`GET /api/admin/finance/payment-orders/${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar la orden de pago.' },
      { status: 500 }
    )
  }
}
