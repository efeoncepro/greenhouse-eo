import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listHes, createHes } from '@/lib/finance/hes-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const items = await listHes({
      clientId: searchParams.get('clientId') || undefined,
      status: searchParams.get('status') || undefined,
      purchaseOrderId: searchParams.get('purchaseOrderId') || undefined
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({ items: [], total: 0 })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.hesNumber || !body.clientId || !body.serviceDescription || !body.amount) {
    return NextResponse.json({ error: 'Missing required fields: hesNumber, clientId, serviceDescription, amount' }, { status: 400 })
  }

  const result = await createHes({ ...body, createdBy: tenant.userId })

  return NextResponse.json(result, { status: 201 })
}
