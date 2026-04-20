import { NextResponse } from 'next/server'

import { publishQuotationUpdated } from '@/lib/commercial/quotation-events'
import { query } from '@/lib/db'
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
import {
  persistQuotationPricing,
  resolveQuotationIdentity,
  type QuotationBillingFrequency,
  type QuotationDiscountType,
  type QuotationLineInput,
  type QuotationPricingCurrency
} from '@/lib/finance/pricing'
import { isUnpricedQuotationLineItemsError } from '@/lib/finance/pricing/quotation-line-input-validation'
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

interface ReplaceLinesPayload {
  lineItems: QuotationLineInput[]
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

  let body: ReplaceLinesPayload

  try {
    body = (await request.json()) as ReplaceLinesPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!Array.isArray(body.lineItems)) {
    return NextResponse.json({ error: 'lineItems must be an array.' }, { status: 400 })
  }

  const header = await query<{
    business_line_code: string | null
    currency: string
    quote_date: string | Date | null
    billing_frequency: string
    contract_duration_months: number | null
    global_discount_type: string | null
    global_discount_value: string | number | null
    target_margin_pct: string | number | null
    margin_floor_pct: string | number | null
    exchange_rates: Record<string, unknown> | null
    exchange_snapshot_date: string | Date | null
    current_version: number
  }>(
    `SELECT business_line_code, currency, quote_date,
            billing_frequency, contract_duration_months,
            global_discount_type, global_discount_value,
            target_margin_pct, margin_floor_pct,
            exchange_rates, exchange_snapshot_date, current_version
     FROM greenhouse_commercial.quotations
     WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const row = header[0]

  if (!row) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const quoteDate =
    row.quote_date instanceof Date
      ? row.quote_date.toISOString().slice(0, 10)
      : (row.quote_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10)

  const exchangeRates: Record<string, number> = {}

  if (row.exchange_rates && typeof row.exchange_rates === 'object') {
    for (const [key, val] of Object.entries(row.exchange_rates)) {
      const num = Number(val)

      if (Number.isFinite(num) && num > 0) exchangeRates[key] = num
    }
  }

  try {
    const snapshot = await persistQuotationPricing(
      {
        quotationId: identity.quotationId,
        versionNumber: row.current_version,
        businessLineCode: row.business_line_code,
        quoteCurrency: (row.currency as QuotationPricingCurrency) || 'CLP',
        quoteDate,
        billingFrequency: (row.billing_frequency as QuotationBillingFrequency) || 'one_time',
        contractDurationMonths: row.contract_duration_months,
        exchangeRates,
        exchangeSnapshotDate:
          row.exchange_snapshot_date instanceof Date
            ? row.exchange_snapshot_date.toISOString().slice(0, 10)
            : row.exchange_snapshot_date?.slice(0, 10) ?? null,
        globalDiscountType: row.global_discount_type as QuotationDiscountType | null,
        globalDiscountValue:
          row.global_discount_value != null ? Number(row.global_discount_value) : null,
        marginTargetPct: row.target_margin_pct != null ? Number(row.target_margin_pct) : null,
        marginFloorPct: row.margin_floor_pct != null ? Number(row.margin_floor_pct) : null,
        lineItems: body.lineItems,
        createdBy: tenant.userId
      },
      {
        createVersion: body.createVersion ?? false,
        versionNotes: body.createVersion ? 'Line items replaced via API.' : null
      }
    )

    const quotationRows = await query<{
      hubspot_quote_id: string | null
      hubspot_deal_id: string | null
      source_system: string | null
      organization_id: string | null
      pricing_model: string | null
      commercial_model: string | null
      staffing_model: string | null
    }>(
      `SELECT hubspot_quote_id,
              hubspot_deal_id,
              source_system,
              organization_id,
              pricing_model,
              commercial_model,
              staffing_model
         FROM greenhouse_commercial.quotations
        WHERE quotation_id = $1
        LIMIT 1`,
      [identity.quotationId]
    )

    const quotation = quotationRows[0]

    await publishQuotationUpdated({
      quotationId: identity.quotationId,
      quoteId: identity.financeQuoteId ?? identity.quotationId,
      hubspotQuoteId: quotation?.hubspot_quote_id ?? null,
      hubspotDealId: quotation?.hubspot_deal_id ?? null,
      sourceSystem: quotation?.source_system ?? null,
      organizationId: quotation?.organization_id ?? null,
      spaceId: null,
      updatedBy: tenant.userId,
      changedFields: ['line_items'],
      pricingModel: quotation?.pricing_model ?? null,
      commercialModel: quotation?.commercial_model ?? null,
      staffingModel: quotation?.staffing_model ?? null
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
        quantity: line.quantity,
        unitCost: line.unitCost,
        unitPrice: line.unitPrice,
        subtotalCost: line.subtotalCost,
        subtotalPrice: line.subtotalPrice,
        discountAmount: line.discountAmount,
        subtotalAfterDiscount: line.subtotalAfterDiscount,
        effectiveMarginPct: line.effectiveMarginPct,
        recurrenceType: line.recurrenceType,
        resolutionNotes: line.resolutionNotes
      }))
    })
  } catch (error) {
    if (isUnpricedQuotationLineItemsError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          quotationId: identity.quotationId
        },
        { status: 422 }
      )
    }

    throw error
  }
}
