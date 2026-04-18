import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPurchaseOrder, updatePurchaseOrder } from '@/lib/finance/purchase-order-store'
import { linkPurchaseOrderToQuotation } from '@/lib/finance/quote-to-cash/link-purchase-order'

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

  // Detect whether quotation_id is changing — we need to fire the canonical
  // link helper (audit + outbox) only when the link actually changes.
  const quotationIdProvided = Object.prototype.hasOwnProperty.call(body, 'quotationId')
  const nextQuotationId = quotationIdProvided && body.quotationId ? String(body.quotationId) : null

  let previousQuotationId: string | null = null

  if (quotationIdProvided) {
    const existing = await getPurchaseOrder(id)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    previousQuotationId = existing.quotationId
  }

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
    spaceId: body.spaceId,
    ...(quotationIdProvided ? { quotationId: nextQuotationId } : {})
  })

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // TASK-350: fire the canonical link helper so audit + outbox events are
  // recorded when the PO is newly linked (or relinked) to a quotation.
  if (quotationIdProvided && nextQuotationId && nextQuotationId !== previousQuotationId) {
    try {
      await linkPurchaseOrderToQuotation({
        poId: id,
        quotationId: nextQuotationId,
        actor: {
          userId: tenant.userId,
          name: tenant.clientName || tenant.userId
        }
      })
    } catch (linkError) {
      const message = linkError instanceof Error ? linkError.message : 'Error al vincular la cotización.'

      return NextResponse.json({ error: message }, { status: 409 })
    }
  }

  return NextResponse.json(result)
}
