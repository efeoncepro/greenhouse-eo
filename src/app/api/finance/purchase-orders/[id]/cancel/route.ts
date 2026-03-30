import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { cancelPurchaseOrder } from '@/lib/finance/purchase-order-store'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await cancelPurchaseOrder(id)

  if (!result) return NextResponse.json({ error: 'PO not found or not active' }, { status: 404 })

  return NextResponse.json(result)
}
