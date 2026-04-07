import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface QuoteDetailRow extends Record<string, unknown> {
  quote_id: string
  client_id: string | null
  organization_id: string | null
  client_name: string | null
  quote_number: string | null
  quote_date: string | null
  due_date: string | null
  expiry_date: string | null
  description: string | null
  currency: string
  subtotal: string | number | null
  tax_rate: string | number | null
  tax_amount: string | number | null
  total_amount: string | number
  total_amount_clp: string | number
  exchange_rate_to_clp: string | number | null
  status: string
  converted_to_income_id: string | null
  nubox_document_id: string | null
  nubox_sii_track_id: string | null
  nubox_emission_status: string | null
  dte_type_code: string | null
  dte_folio: string | null
  source_system: string | null
  hubspot_quote_id: string | null
  hubspot_deal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
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

  const rows = await runGreenhousePostgresQuery<QuoteDetailRow>(
    `SELECT quote_id, client_id, organization_id, client_name,
            quote_number, quote_date, due_date, expiry_date, description,
            currency, subtotal, tax_rate, tax_amount, total_amount,
            total_amount_clp, exchange_rate_to_clp, status,
            converted_to_income_id,
            nubox_document_id, nubox_sii_track_id, nubox_emission_status,
            dte_type_code, dte_folio,
            source_system, hubspot_quote_id, hubspot_deal_id,
            notes, created_at, updated_at
     FROM greenhouse_finance.quotes
     WHERE quote_id = $1`,
    [quoteId]
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const r = rows[0]

  return NextResponse.json({
    quoteId: String(r.quote_id),
    clientId: r.client_id ? String(r.client_id) : null,
    organizationId: r.organization_id ? String(r.organization_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    quoteNumber: r.quote_number ? String(r.quote_number) : null,
    quoteDate: toDateString(r.quote_date as string | null),
    dueDate: toDateString(r.due_date as string | null),
    expiryDate: toDateString(r.expiry_date as string | null),
    description: r.description ? String(r.description) : null,
    currency: String(r.currency || 'CLP'),
    subtotal: r.subtotal !== null ? roundCurrency(toNumber(r.subtotal)) : null,
    taxRate: r.tax_rate !== null ? toNumber(r.tax_rate) : null,
    taxAmount: r.tax_amount !== null ? roundCurrency(toNumber(r.tax_amount)) : null,
    totalAmount: roundCurrency(toNumber(r.total_amount)),
    totalAmountClp: roundCurrency(toNumber(r.total_amount_clp)),
    exchangeRateToClp: r.exchange_rate_to_clp !== null ? toNumber(r.exchange_rate_to_clp) : null,
    status: String(r.status || 'sent'),
    convertedToIncomeId: r.converted_to_income_id ? String(r.converted_to_income_id) : null,
    nuboxDocumentId: r.nubox_document_id ? String(r.nubox_document_id) : null,
    nuboxSiiTrackId: r.nubox_sii_track_id ? String(r.nubox_sii_track_id) : null,
    nuboxEmissionStatus: r.nubox_emission_status ? String(r.nubox_emission_status) : null,
    dteTypeCode: r.dte_type_code ? String(r.dte_type_code) : null,
    dteFolio: r.dte_folio ? String(r.dte_folio) : null,
    source: String(r.source_system || 'manual'),
    hubspotQuoteId: r.hubspot_quote_id ? String(r.hubspot_quote_id) : null,
    hubspotDealId: r.hubspot_deal_id ? String(r.hubspot_deal_id) : null,
    notes: r.notes ? String(r.notes) : null,
    createdAt: r.created_at ? String(r.created_at) : null,
    updatedAt: r.updated_at ? String(r.updated_at) : null
  })
}
