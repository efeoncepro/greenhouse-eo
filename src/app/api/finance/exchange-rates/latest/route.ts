import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getLatestStoredExchangeRatePair, syncDailyUsdClpExchangeRate } from '@/lib/finance/exchange-rates'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  let latestRate = await getLatestStoredExchangeRatePair({
    fromCurrency: 'USD',
    toCurrency: 'CLP'
  })

  if (!latestRate) {
    await syncDailyUsdClpExchangeRate()
    latestRate = await getLatestStoredExchangeRatePair({
      fromCurrency: 'USD',
      toCurrency: 'CLP'
    })
  }

  if (!latestRate) {
    return NextResponse.json({
      available: false,
      rate: null,
      rateDate: null,
      source: null
    })
  }

  return NextResponse.json({
    available: true,
    fromCurrency: latestRate.fromCurrency,
    toCurrency: latestRate.toCurrency,
    rate: latestRate.rate,
    rateDate: latestRate.rateDate,
    source: latestRate.source
  })
}
