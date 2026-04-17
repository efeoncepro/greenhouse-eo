import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  listFinanceQuoteLinesFromCanonical,
  mapCanonicalQuoteLineRow
} from '@/lib/finance/quotation-canonical-store'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface LineItemRow extends Record<string, unknown> {
  line_item_id: string
  quote_id: string
  product_id: string | null
  source_system: string
  line_number: number | null
  name: string
  description: string | null
  quantity: string | number
  unit_price: string | number
  discount_percent: string | number | null
  discount_amount: string | number | null
  tax_amount: string | number | null
  total_amount: string | number | null
  hubspot_line_item_id: string | null
  hubspot_product_id: string | null
  product_name: string | null
  product_sku: string | null
}

const getLegacyQuoteLines = async (quoteId: string) => {
  const rows = await runGreenhousePostgresQuery<LineItemRow>(
    `SELECT li.line_item_id, li.quote_id, li.product_id, li.source_system,
            li.line_number, li.name, li.description, li.quantity, li.unit_price,
            li.discount_percent, li.discount_amount, li.tax_amount, li.total_amount,
            li.hubspot_line_item_id, li.hubspot_product_id,
            p.name AS product_name, p.sku AS product_sku
     FROM greenhouse_finance.quote_line_items li
     LEFT JOIN greenhouse_finance.products p ON p.product_id = li.product_id
     WHERE li.quote_id = $1
     ORDER BY li.line_number ASC NULLS LAST, li.created_at ASC`,
    [quoteId]
  )

  return rows.map(r => ({
    lineItemId: String(r.line_item_id),
    quoteId: String(r.quote_id),
    productId: r.product_id ? String(r.product_id) : null,
    source: String(r.source_system || 'manual'),
    lineNumber: r.line_number ? Number(r.line_number) : null,
    name: String(r.name),
    description: r.description ? String(r.description) : null,
    quantity: toNumber(r.quantity),
    unitPrice: roundCurrency(toNumber(r.unit_price)),
    discountPercent: r.discount_percent !== null ? toNumber(r.discount_percent) : null,
    discountAmount: r.discount_amount !== null ? roundCurrency(toNumber(r.discount_amount)) : null,
    taxAmount: r.tax_amount !== null ? roundCurrency(toNumber(r.tax_amount)) : null,
    totalAmount: r.total_amount !== null ? roundCurrency(toNumber(r.total_amount)) : null,
    hubspotLineItemId: r.hubspot_line_item_id ? String(r.hubspot_line_item_id) : null,
    hubspotProductId: r.hubspot_product_id ? String(r.hubspot_product_id) : null,
    product: r.product_name ? { name: String(r.product_name), sku: r.product_sku ? String(r.product_sku) : null } : null
  }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params

  try {
    const rows = await listFinanceQuoteLinesFromCanonical({ tenant, quoteId })

    const items = rows.map(row => {
      const mapped = mapCanonicalQuoteLineRow(row)

      return {
        ...mapped,
        unitPrice: roundCurrency(mapped.unitPrice),
        discountAmount: mapped.discountAmount !== null ? roundCurrency(mapped.discountAmount) : null,
        taxAmount: mapped.taxAmount !== null ? roundCurrency(mapped.taxAmount) : null,
        totalAmount: mapped.totalAmount !== null ? roundCurrency(mapped.totalAmount) : null
      }
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('quote_line_items', error)

      const legacyItems = await getLegacyQuoteLines(quoteId).catch(() => null)

      if (legacyItems) {
        return NextResponse.json({ items: legacyItems, total: legacyItems.length })
      }

      return financeSchemaDriftResponse('quote_line_items', { items: [], total: 0 })
    }

    throw error
  }
}
