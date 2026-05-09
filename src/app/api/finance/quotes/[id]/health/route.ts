import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import {
  checkDiscountHealth,
  resolveMarginTarget,
  resolveQuotationIdentity
} from '@/lib/finance/pricing'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params
  const identity = await resolveQuotationIdentity(quoteId)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const header = await query<{
    business_line_code: string | null
    quote_date: string | Date | null
    total_cost: string | number | null
    total_price_before_discount: string | number | null
    total_discount: string | number | null
    total_price: string | number | null
    effective_margin_pct: string | number | null
    target_margin_pct: string | number | null
    margin_floor_pct: string | number | null
  }>(
    `SELECT business_line_code, quote_date,
            total_cost, total_price_before_discount, total_discount,
            total_price, effective_margin_pct,
            target_margin_pct, margin_floor_pct
     FROM greenhouse_commercial.quotations
     WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const row = header[0]

  if (!row) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const lineRows = await query<{
    line_item_id: string
    subtotal_after_discount: string | number | null
    subtotal_cost: string | number | null
  }>(
    `SELECT line_item_id, subtotal_after_discount, subtotal_cost
     FROM greenhouse_commercial.quotation_line_items
     WHERE quotation_id = $1
       AND version_number = (SELECT current_version FROM greenhouse_commercial.quotations WHERE quotation_id = $1)`,
    [identity.quotationId]
  )

  const quoteDate =
    row.quote_date instanceof Date
      ? row.quote_date.toISOString().slice(0, 10)
      : row.quote_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  const marginResolution = await resolveMarginTarget({
    businessLineCode: row.business_line_code,
    quoteDate,
    quotationOverride:
      row.target_margin_pct != null && row.margin_floor_pct != null
        ? {
            targetMarginPct: Number(row.target_margin_pct),
            floorMarginPct: Number(row.margin_floor_pct)
          }
        : null
  })

  const health = checkDiscountHealth({
    totals: {
      totalCost: Number(row.total_cost ?? 0),
      totalPriceBeforeDiscount: Number(row.total_price_before_discount ?? 0),
      totalDiscount: Number(row.total_discount ?? 0),
      totalPrice: Number(row.total_price ?? 0),
      effectiveMarginPct: row.effective_margin_pct != null ? Number(row.effective_margin_pct) : null
    },
    marginTargetPct: marginResolution.targetMarginPct,
    marginFloorPct: marginResolution.floorMarginPct,
    lineItems: lineRows.map(line => ({
      lineItemId: line.line_item_id,
      subtotalAfterDiscount: Number(line.subtotal_after_discount ?? 0),
      subtotalCost: line.subtotal_cost != null ? Number(line.subtotal_cost) : null
    }))
  })

  return NextResponse.json({
    quotationId: identity.quotationId,
    marginResolution,
    health
  })
}
