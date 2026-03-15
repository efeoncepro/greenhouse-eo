import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  fetchUsdToClpFromProviders,
  getLatestStoredExchangeRatePair,
  syncDailyUsdClpExchangeRate
} from '@/lib/finance/exchange-rates'

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

  // If no stored rate, attempt a non-blocking sync (best effort, 8s timeout)
  if (!latestRate) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      await syncDailyUsdClpExchangeRate()
      clearTimeout(timeout)

      latestRate = await getLatestStoredExchangeRatePair({
        fromCurrency: 'USD',
        toCurrency: 'CLP'
      })
    } catch (syncError) {
      console.warn('[exchange-rates/latest] sync failed:', syncError instanceof Error ? syncError.message : syncError)
    }
  }

  if (!latestRate) {
    const liveRate = await fetchUsdToClpFromProviders()

    if (liveRate) {
      return NextResponse.json({
        available: true,
        fromCurrency: 'USD',
        toCurrency: 'CLP',
        rate: liveRate.usdToClp,
        rateDate: liveRate.rateDate,
        source: `${liveRate.source}:live`
      })
    }

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
