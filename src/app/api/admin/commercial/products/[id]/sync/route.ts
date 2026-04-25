import { NextResponse } from 'next/server'

import { getCommercialProduct } from '@/lib/commercial/product-catalog-store'
import { pushProductToHubSpot } from '@/lib/hubspot/push-product-to-hubspot'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Admin API: manual outbound sync.
//
// Admin clicks "Sincronizar a HubSpot" → this endpoint invokes
// `pushProductToHubSpot` synchronously and returns the structured
// result so the UI can show success/error detail inline.
// ─────────────────────────────────────────────────────────────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = id.trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const entry = await getCommercialProduct(productId)

  if (!entry) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  try {
    const result = await pushProductToHubSpot({
      productId: entry.productId,
      eventType: 'commercial.product_catalog.updated',
      actorId: tenant.userId
    })

    return NextResponse.json({
      productId: entry.productId,
      status: result.status,
      action: result.action,
      hubspotProductId: result.hubspotProductId ?? null,
      reason: result.reason ?? null
    })
  } catch (err) {
    return NextResponse.json(
      {
        productId: entry.productId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    )
  }
}
