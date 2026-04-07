import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface QuoteRow extends Record<string, unknown> {
  quote_id: string
  client_id: string | null
  client_name: string | null
  quote_number: string | null
  quote_date: string | null
  due_date: string | null
  total_amount: string | number
  total_amount_clp: string | number
  currency: string
  status: string
  converted_to_income_id: string | null
  nubox_document_id: string | null
  source_system: string | null
  hubspot_quote_id: string | null
  hubspot_deal_id: string | null
  created_at: string
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')
  const source = searchParams.get('source')

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx++
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (status) push('status = $?', status)
  if (clientId) push('client_id = $?', clientId)
  if (source) push('source_system = $?', source)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const rows = await runGreenhousePostgresQuery<QuoteRow>(
      `SELECT quote_id, client_id, client_name, quote_number, quote_date, due_date,
              total_amount, total_amount_clp, currency, status,
              converted_to_income_id, nubox_document_id,
              source_system, hubspot_quote_id, hubspot_deal_id, created_at
       FROM greenhouse_finance.quotes
       ${whereClause}
       ORDER BY quote_date DESC NULLS LAST, created_at DESC
       LIMIT 200`,
      values
    )

    const items = rows.map(r => ({
      quoteId: String(r.quote_id),
      clientId: r.client_id ? String(r.client_id) : null,
      clientName: r.client_name ? String(r.client_name) : null,
      quoteNumber: r.quote_number ? String(r.quote_number) : null,
      quoteDate: toDateString(r.quote_date as string | null),
      dueDate: toDateString(r.due_date as string | null),
      totalAmount: roundCurrency(toNumber(r.total_amount)),
      totalAmountClp: roundCurrency(toNumber(r.total_amount_clp)),
      currency: String(r.currency || 'CLP'),
      status: String(r.status || 'sent'),
      convertedToIncomeId: r.converted_to_income_id ? String(r.converted_to_income_id) : null,
      nuboxDocumentId: r.nubox_document_id ? String(r.nubox_document_id) : null,
      source: String(r.source_system || 'manual'),
      hubspotQuoteId: r.hubspot_quote_id ? String(r.hubspot_quote_id) : null,
      hubspotDealId: r.hubspot_deal_id ? String(r.hubspot_deal_id) : null,
      isFromNubox: Boolean(r.nubox_document_id)
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    // Table may not exist yet
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('quotes', error)

      return financeSchemaDriftResponse('quotes', { items: [], total: 0 })
    }

    throw error
  }
}
