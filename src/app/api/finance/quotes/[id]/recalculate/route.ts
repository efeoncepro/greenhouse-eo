import { NextResponse } from 'next/server'

import {
  recalculateQuotationPricing,
  resolveQuotationIdentity
} from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RecalculatePayload {
  createVersion?: boolean
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params
  const identity = await resolveQuotationIdentity(quoteId)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: RecalculatePayload = {}

  try {
    const raw = await request.text()

    body = raw ? (JSON.parse(raw) as RecalculatePayload) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const snapshot = await recalculateQuotationPricing({
    quotationId: identity.quotationId,
    createdBy: tenant.userId,
    createVersion: body.createVersion ?? false
  })

  return NextResponse.json({
    quotationId: identity.quotationId,
    versionNumber: snapshot.versionNumber,
    totals: snapshot.totals,
    revenue: snapshot.revenue,
    marginResolution: snapshot.marginResolution,
    health: snapshot.health,
    lineItems: snapshot.lineItems.map(line => ({
      lineItemId: line.lineItemId ?? null,
      label: line.label,
      lineType: line.lineType,
      unitCost: line.unitCost,
      unitPrice: line.unitPrice,
      subtotalCost: line.subtotalCost,
      subtotalAfterDiscount: line.subtotalAfterDiscount,
      effectiveMarginPct: line.effectiveMarginPct,
      resolutionNotes: line.resolutionNotes
    }))
  })
}
