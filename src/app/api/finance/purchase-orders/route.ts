import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listPurchaseOrders, createPurchaseOrder } from '@/lib/finance/purchase-order-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined
  const status = searchParams.get('status') || undefined

  try {
    const items = await listPurchaseOrders({ clientId, status })

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
  const { poNumber, clientId, authorizedAmount, issueDate } = body

  if (!poNumber || !clientId || !authorizedAmount || !issueDate) {
    return NextResponse.json({ error: 'Missing required fields: poNumber, clientId, authorizedAmount, issueDate' }, { status: 400 })
  }

  const result = await createPurchaseOrder({
    poNumber,
    clientId,
    organizationId: body.organizationId,
    spaceId: body.spaceId ?? tenant.spaceId ?? null,
    authorizedAmount: Number(authorizedAmount),
    currency: body.currency,
    exchangeRateToClp: body.exchangeRateToClp ? Number(body.exchangeRateToClp) : undefined,
    issueDate,
    expiryDate: body.expiryDate,
    description: body.description,
    serviceScope: body.serviceScope,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    attachmentAssetId: body.attachmentAssetId,
    notes: body.notes,
    attachmentUrl: body.attachmentUrl,
    createdBy: tenant.userId
  })

  return NextResponse.json(result, { status: 201 })
}
