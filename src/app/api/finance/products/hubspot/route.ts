import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { createHubSpotProduct } from '@/lib/hubspot/create-hubspot-product'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const name = body.name?.trim()
    const sku = body.sku?.trim()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!sku || typeof sku !== 'string') {
      return NextResponse.json({ error: 'sku is required' }, { status: 400 })
    }

    const result = await createHubSpotProduct({
      name,
      sku,
      description: body.description?.trim() || undefined,
      unitPrice: typeof body.unitPrice === 'number' ? body.unitPrice : undefined,
      costOfGoodsSold: typeof body.costOfGoodsSold === 'number' ? body.costOfGoodsSold : undefined,
      tax: typeof body.tax === 'number' ? body.tax : undefined,
      isRecurring: body.isRecurring === true,
      billingFrequency: body.billingFrequency || undefined,
      billingPeriodCount: typeof body.billingPeriodCount === 'number' ? body.billingPeriodCount : undefined,
      createdBy: tenant.userId
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[products/hubspot] Create failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
