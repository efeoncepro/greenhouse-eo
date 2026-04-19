// Frankfurter.dev adapter (ECB-backed, free, no auth — MXN fallback).
//
// Frankfurter proxies the European Central Bank's reference rates. It
// only serves currencies the ECB publishes, so we restrict this adapter
// to USD↔MXN as the canonical "universal" fallback for Mexico when
// Banxico SIE is unavailable (token missing, outage, rate limit).
//
// ECB does not publish on weekends/holidays; Frankfurter returns the
// last published rate for those dates so `fecha != requested` is our
// signal for carry.

import { roundCurrency } from '@/lib/finance/shared'

import {
  deriveIsCarried,
  isValidRateValue,
  normalizeRateDate,
  type FxProviderAdapter,
  type FxRateFetchInput,
  type FxRateFetchResult,
  type FxRateHistoricalRangeInput
} from '../provider-adapter'
import { fetchWithRetry } from '../fetch-helper'

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v1'

interface FrankfurterResponse {
  base?: string
  date?: string
  rates?: Record<string, number>
}

const addDaysIso = (isoDate: string, delta: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + delta)

  return base.toISOString().slice(0, 10)
}

const fetchFrankfurterUsdMxn = async (
  isoDate: string | null,
  timeoutMs = 6000
): Promise<{ rate: number; rateDate: string } | null> => {
  const path = isoDate ?? 'latest'
  const url = `${FRANKFURTER_BASE_URL}/${path}?base=USD&symbols=MXN`

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    timeoutMs
  })

  if (!response || !response.ok) return null

  try {
    const payload = (await response.json()) as FrankfurterResponse
    const rawRate = payload.rates?.MXN

    if (!isValidRateValue(rawRate)) return null

    const fetchedDate = normalizeRateDate(payload.date ?? null)

    if (!fetchedDate) return null

    return { rate: rawRate, rateDate: fetchedDate }
  } catch {
    return null
  }
}

export const frankfurterAdapter: FxProviderAdapter = {
  code: 'frankfurter',
  displayName: 'Frankfurter.dev (ECB reference — MXN fallback)',
  publishedDayPattern: 'weekdays_only',
  supportsHistorical: true,
  requiresSecret: false,
  secretEnvVar: null,

  async fetchDailyRate({
    fromCurrency,
    toCurrency,
    rateDate
  }: FxRateFetchInput): Promise<FxRateFetchResult | null> {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()

    if (!((from === 'USD' && to === 'MXN') || (from === 'MXN' && to === 'USD'))) {
      return null
    }

    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    try {
      const result = await fetchFrankfurterUsdMxn(rateDate ?? null)

      if (!result) return null

      // Raw value is MXN per USD. Invert for MXN→USD.
      const rate = from === 'USD' && to === 'MXN' ? result.rate : 1 / result.rate

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(rate),
        rateDate: result.rateDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, result.rateDate),
        source: 'frankfurter',
        publishedAt: null
      }
    } catch {
      return null
    }
  },

  async fetchHistoricalRange({
    fromCurrency,
    toCurrency,
    startDate,
    endDate
  }: FxRateHistoricalRangeInput): Promise<FxRateFetchResult[]> {
    const from = fromCurrency.toUpperCase()
    const to = toCurrency.toUpperCase()

    if (!((from === 'USD' && to === 'MXN') || (from === 'MXN' && to === 'USD'))) {
      return []
    }

    const results: FxRateFetchResult[] = []
    const seen = new Set<string>()
    let cursor = startDate

    while (cursor <= endDate) {
      const result = await this.fetchDailyRate({
        fromCurrency: from,
        toCurrency: to,
        rateDate: cursor
      })

      if (result && !seen.has(result.rateDate)) {
        results.push({ ...result, requestedDate: result.rateDate, isCarried: false })
        seen.add(result.rateDate)
      }

      cursor = addDaysIso(cursor, 1)
    }

    return results
  },

  async ping() {
    const start = Date.now()

    try {
      const response = await fetchWithRetry(
        `${FRANKFURTER_BASE_URL}/latest?base=USD&symbols=MXN`,
        {
          headers: { Accept: 'application/json' },
          timeoutMs: 3000,
          maxRetries: 1
        }
      )

      return {
        reachable: response !== null && response.ok,
        latencyMs: Date.now() - start
      }
    } catch (error) {
      return {
        reachable: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
