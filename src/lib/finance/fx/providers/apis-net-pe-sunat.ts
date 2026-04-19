// apis.net.pe SUNAT adapter (Perú — SBS Venta rate).
//
// Free aggregator that proxies the SUNAT/SBS official tipo de cambio
// (compra/venta). Invoicing convention in Peru uses the SBS "venta"
// (sell) rate, so that's what we emit. Published weekdays only; on
// weekends/holidays the upstream returns the last published value and
// we mark it as carried when fecha ≠ requested.
//
// Historical range is a per-day loop — works but slow. For any backfill
// longer than a few weeks, prefer the `bcrp` adapter which covers the
// whole range in a single request.

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

const APIS_NET_PE_BASE_URL = 'https://api.apis.net.pe/v1/tipo-cambio-sunat'

interface SunatResponse {
  compra?: number | string
  venta?: number | string
  origen?: string
  fecha?: string
}

const parseRate = (raw: unknown): number | null => {
  const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN

  if (!isValidRateValue(num)) return null

  return num
}

const addDaysIso = (isoDate: string, delta: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + delta)

  return base.toISOString().slice(0, 10)
}

const fetchSunatForDate = async (
  isoDate: string | null,
  timeoutMs = 6000
): Promise<{ rate: number; rateDate: string } | null> => {
  const url = isoDate
    ? `${APIS_NET_PE_BASE_URL}?fecha=${encodeURIComponent(isoDate)}`
    : APIS_NET_PE_BASE_URL

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    timeoutMs
  })

  if (!response || !response.ok) return null

  try {
    const payload = (await response.json()) as SunatResponse
    const ventaRate = parseRate(payload.venta)
    const fetchedDate = normalizeRateDate(payload.fecha ?? null)

    if (ventaRate === null || !fetchedDate) return null

    return { rate: ventaRate, rateDate: fetchedDate }
  } catch {
    return null
  }
}

export const apisNetPeSunatAdapter: FxProviderAdapter = {
  code: 'apis_net_pe_sunat',
  displayName: 'apis.net.pe (Perú — SUNAT SBS Venta)',
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

    if (!((from === 'USD' && to === 'PEN') || (from === 'PEN' && to === 'USD'))) {
      return null
    }

    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    try {
      const result = await fetchSunatForDate(rateDate ?? null)

      if (!result) return null

      // Raw value is PEN per USD. Invert for PEN→USD.
      const rate = from === 'USD' && to === 'PEN' ? result.rate : 1 / result.rate

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(rate),
        rateDate: result.rateDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, result.rateDate),
        source: 'apis_net_pe_sunat:SBS_venta',
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

    if (!((from === 'USD' && to === 'PEN') || (from === 'PEN' && to === 'USD'))) {
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
        // Deduplicate by rateDate so we don't write the same carried
        // value for a whole weekend.
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
      const response = await fetchWithRetry(APIS_NET_PE_BASE_URL, {
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
