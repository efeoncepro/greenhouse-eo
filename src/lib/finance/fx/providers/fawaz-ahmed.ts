// Fawaz Ahmed currency-api adapter (universal fallback).
//
// Free jsDelivr-hosted currency dataset updated daily, no auth. Covers
// every ISO 4217 currency we care about plus a long tail of exotic
// ones. Accepts any pair, so the orchestrator uses it as a last-resort
// fallback when regional providers (Banxico, BanRep, SUNAT) fail.
//
// Historical access is via date-pinned URL (`@YYYY-MM-DD`). We iterate
// per-day for ranges — the CDN is fast but there's no bulk endpoint.

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

const FAWAZ_AHMED_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api'

const buildUrl = (tag: string, baseLower: string): string =>
  `${FAWAZ_AHMED_BASE_URL}@${tag}/v1/currencies/${baseLower}.json`

interface FawazResponse {
  date?: string
  [baseLower: string]: string | Record<string, number> | undefined
}

const addDaysIso = (isoDate: string, delta: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + delta)

  return base.toISOString().slice(0, 10)
}

const fetchFawazRate = async (
  baseLower: string,
  targetLower: string,
  tag: string,
  timeoutMs = 6000
): Promise<{ rate: number; rateDate: string } | null> => {
  const response = await fetchWithRetry(buildUrl(tag, baseLower), {
    headers: { Accept: 'application/json' },
    timeoutMs
  })

  if (!response || !response.ok) return null

  try {
    const payload = (await response.json()) as FawazResponse
    const rates = payload[baseLower]

    if (!rates || typeof rates !== 'object') return null

    const rawRate = (rates as Record<string, number>)[targetLower]

    if (!isValidRateValue(rawRate)) return null

    const fetchedDate = normalizeRateDate(payload.date ?? null)

    if (!fetchedDate) return null

    return { rate: rawRate, rateDate: fetchedDate }
  } catch {
    return null
  }
}

export const fawazAhmedAdapter: FxProviderAdapter = {
  code: 'fawaz_ahmed',
  displayName: 'Fawaz Ahmed currency-api (universal fallback)',
  publishedDayPattern: 'all_days',
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
    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    if (!from || !to || from === to) return null

    const baseLower = from.toLowerCase()
    const targetLower = to.toLowerCase()
    const tag = rateDate ?? 'latest'

    try {
      const result = await fetchFawazRate(baseLower, targetLower, tag)

      if (!result) return null

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(result.rate),
        rateDate: result.rateDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, result.rateDate),
        source: 'fawaz_ahmed',
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
    const results: FxRateFetchResult[] = []
    let cursor = startDate

    while (cursor <= endDate) {
      const result = await this.fetchDailyRate({
        fromCurrency,
        toCurrency,
        rateDate: cursor
      })

      if (result) results.push(result)

      cursor = addDaysIso(cursor, 1)
    }

    return results
  },

  async ping() {
    const start = Date.now()

    try {
      const response = await fetchWithRetry(buildUrl('latest', 'usd'), {
        headers: { Accept: 'application/json' },
        timeoutMs: 3000,
        maxRetries: 1
      })

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
