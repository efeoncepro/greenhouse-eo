import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentObligationsHealthGrid } from '@/lib/finance/payment-obligations/health-grid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getPaymentObligationsHealthGrid()

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET payment-obligations/health-grid failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar la salud del bridge.' },
      { status: 500 }
    )
  }
}
