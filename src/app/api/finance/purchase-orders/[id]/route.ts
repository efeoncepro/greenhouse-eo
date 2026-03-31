import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPurchaseOrder, updatePurchaseOrder } from '@/lib/finance/purchase-order-store'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const po = await getPurchaseOrder(id)

  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(po)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const result = await updatePurchaseOrder(id, {
    poNumber: body.poNumber,
    expiryDate: body.expiryDate,
    description: body.description,
    serviceScope: body.serviceScope,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    notes: body.notes,
    attachmentAssetId: body.attachmentAssetId,
    attachmentUrl: body.attachmentUrl,
    createdBy: tenant.userId,
    clientId: body.clientId,
    spaceId: body.spaceId
  })

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(result)
}
