import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { runFinanceQuery, getFinanceProjectId, toNumber, toDateString, normalizeString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface LatestRateRow {
  from_currency: string
  to_currency: string
  rate: unknown
  rate_date: unknown
  source: string | null
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<LatestRateRow>(`
    SELECT from_currency, to_currency, rate, rate_date, source
    FROM \`${projectId}.greenhouse.fin_exchange_rates\`
    WHERE from_currency = 'USD' AND to_currency = 'CLP'
    ORDER BY rate_date DESC
    LIMIT 1
  `)

  if (rows.length === 0) {
    return NextResponse.json({
      available: false,
      rate: null,
      rateDate: null,
      source: null
    })
  }

  const row = rows[0]

  return NextResponse.json({
    available: true,
    fromCurrency: normalizeString(row.from_currency),
    toCurrency: normalizeString(row.to_currency),
    rate: toNumber(row.rate),
    rateDate: toDateString(row.rate_date as string | { value?: string } | null),
    source: row.source ? normalizeString(row.source) : 'manual'
  })
}
