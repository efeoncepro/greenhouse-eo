import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { getPaymentOrderById } from '@/lib/finance/payment-orders/list-orders'
import { listPaymentOrderSourceInstrumentOptions } from '@/lib/finance/payment-orders/source-instrument-policy'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const order = await getPaymentOrderById(orderId)

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const options = await listPaymentOrderSourceInstrumentOptions(
      {
        query: async <T extends Record<string, unknown>>(text: string, values?: unknown[]) => ({
          rows: await query<T>(text, values ?? [])
        })
      },
      {
        processorSlug: order.processorSlug,
        paymentMethod: order.paymentMethod,
        currency: order.currency,
        sourceAccountId: order.sourceAccountId
      }
    )

    return NextResponse.json({ options })
  } catch (error) {
    console.error(`GET source options for payment order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar los instrumentos elegibles.' },
      { status: 500 }
    )
  }
}
