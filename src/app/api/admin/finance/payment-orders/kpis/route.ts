import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentOrdersKpis } from '@/lib/finance/payment-orders/get-kpis'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const kpis = await getPaymentOrdersKpis({
      spaceId: searchParams.get('spaceId') || undefined,
      periodId: searchParams.get('periodId') || undefined
    })

    return NextResponse.json(kpis)
  } catch (error) {
    console.error('GET payment-orders kpis failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar los KPIs.' },
      { status: 500 }
    )
  }
}
