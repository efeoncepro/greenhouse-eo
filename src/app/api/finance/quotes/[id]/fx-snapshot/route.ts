import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import {
  quotationIdentityHasTenantAnchor,
  tenantCanAccessQuotationIdentity
} from '@/lib/finance/pricing/quotation-tenant-access'
import { extractQuotationFxSnapshot } from '@/lib/finance/quotation-fx-snapshot'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuotationRow extends Record<string, unknown> {
  currency: string | null
  exchange_rates: unknown
  exchange_snapshot_date: string | Date | null
  status: string
  total_price: string | number | null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  
return value.slice(0, 10)
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(parsed) ? parsed : null
}

/**
 * TASK-466 — Read-only endpoint exposing the canonical FX snapshot persisted
 * at issue time. Consumed by `QuoteDetailView` to render the internal
 * "USD / moneda cliente" toggle without mutating the historical document.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  if (!quotationIdentityHasTenantAnchor(identity)) {
    return NextResponse.json(
      { error: 'La cotización no tiene un scope tenant válido.' },
      { status: 409 }
    )
  }

  if (!(await tenantCanAccessQuotationIdentity({ tenant, identity }))) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const rows = await query<QuotationRow>(
    `SELECT currency, exchange_rates, exchange_snapshot_date, status, total_price
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [identity.quotationId]
  )

  const row = rows[0]

  if (!row) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const snapshot = extractQuotationFxSnapshot(row.exchange_rates)
  const outputCurrency = String(row.currency || 'CLP').toUpperCase()
  const totalPrice = toNumberOrNull(row.total_price)

  return NextResponse.json({
    quotationId: identity.quotationId,
    outputCurrency,
    status: row.status,
    exchangeSnapshotDate: toIsoDate(row.exchange_snapshot_date),
    totalPriceOutput: totalPrice,
    totalPriceBase: snapshot && totalPrice !== null && snapshot.rate > 0
      ? Math.round((totalPrice / snapshot.rate) * 100) / 100
      : null,
    snapshot
  })
}
