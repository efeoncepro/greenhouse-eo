// OpenExchangeRates (open.er-api.com) fallback adapter.
//
// Free tier exposes only the latest daily snapshot with USD as base.
// Cannot serve historical dates, so fetchDailyRate ignores `rateDate`
// when it's not today and returns null for truly historical queries.

import { roundCurrency } from '@/lib/finance/shared'

import {
  deriveIsCarried,
  isValidRateValue,
  normalizeRateDate,
  type FxProviderAdapter,
  type FxRateFetchInput,
  type FxRateFetchResult
} from '../provider-adapter'
import { fetchWithRetry } from '../fetch-helper'

const OPEN_ER_API_BASE_URL = 'https://open.er-api.com/v6'

// Free tier is USD-based. Compose inverse and cross pairs client-side.
const fetchLatestUsdBased = async (): Promise<{
  usdRates: Record<string, number>
  rateDate: string
} | null> => {
  const response = await fetchWithRetry(`${OPEN_ER_API_BASE_URL}/latest/USD`, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000
  })

  if (!response || !response.ok) return null

  const payload = (await response.json()) as {
    time_last_update_utc?: string
    rates?: Record<string, number>
  }

  const fetchedDate = typeof payload.time_last_update_utc === 'string'
    ? normalizeRateDate(new Date(payload.time_last_update_utc).toISOString().slice(0, 10))
    : null

  if (!payload.rates || !fetchedDate) return null

  return { usdRates: payload.rates, rateDate: fetchedDate }
}

export const openErApiAdapter: FxProviderAdapter = {
  code: 'open_er_api',
  displayName: 'Open Exchange Rates API (aggregator fallback)',
  publishedDayPattern: 'all_days',
  supportsHistorical: false,
  requiresSecret: false,
  secretEnvVar: null,

  async fetchDailyRate({
    fromCurrency,
    toCurrency,
    rateDate
  }: FxRateFetchInput): Promise<FxRateFetchResult | null> {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()
    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    const latest = await fetchLatestUsdBased()

    if (!latest) return null

    let rate: number | null = null

    if (from === 'USD') {
      const rawValue = latest.usdRates[to]

      if (isValidRateValue(rawValue)) rate = rawValue
    } else if (to === 'USD') {
      const rawValue = latest.usdRates[from]

      if (isValidRateValue(rawValue)) rate = 1 / rawValue
    } else {
      // Cross-pair via USD (composition handled explicitly as allowed)
      const fromUsdRate = latest.usdRates[from]
      const toUsdRate = latest.usdRates[to]

      if (isValidRateValue(fromUsdRate) && isValidRateValue(toUsdRate)) {
        rate = toUsdRate / fromUsdRate
      }
    }

    if (rate === null) return null

    return {
      fromCurrency: from,
      toCurrency: to,
      rate: roundCurrency(rate),
      rateDate: latest.rateDate,
      requestedDate,
      isCarried: deriveIsCarried(requestedDate, latest.rateDate),
      source: 'open_er_api',
      publishedAt: null
    }
  },

  async fetchHistoricalRange(): Promise<FxRateFetchResult[]> {
    // Free tier does not support historical. Return empty; orchestrator
    // will either skip or fall back to registry.historical adapter.
    return []
  },

  async ping() {
    const start = Date.now()

    const response = await fetchWithRetry(`${OPEN_ER_API_BASE_URL}/latest/USD`, {
      headers: { Accept: 'application/json' },
      timeoutMs: 3000,
      maxRetries: 1
    })

    return {
      reachable: response !== null && response.ok,
      latencyMs: Date.now() - start
    }
  }
}
