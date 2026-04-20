// BCRP adapter (Perú — Banco Central de Reserva estadísticas API).
//
// Series PD04640PD is the SBS "venta" rate, same canonical series
// apis.net.pe proxies — but BCRP exposes a historical range endpoint
// that returns the full series for [start, end] in a single request.
// That makes this adapter the preferred path for backfills.
//
// The orchestrator keeps `apis_net_pe_sunat` for daily sync because it's
// an order of magnitude faster for single-date lookups. BCRP is slower
// per-request but amortizes across large ranges.

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

const BCRP_BASE_URL = 'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04640PD/json'

interface BcrpPeriod {
  name?: string
  values?: string[]
}

interface BcrpResponse {
  config?: unknown
  periods?: BcrpPeriod[]
}

const parseRate = (raw: string | undefined | null): number | null => {
  if (typeof raw !== 'string') return null
  const parsed = parseFloat(raw.trim())

  if (!isValidRateValue(parsed)) return null

  return parsed
}

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + deltaDays)

  return base.toISOString().slice(0, 10)
}

const fetchBcrpRange = async (
  startDate: string,
  endDate: string,
  timeoutMs = 8000
): Promise<BcrpPeriod[]> => {
  const url = `${BCRP_BASE_URL}/${startDate}/${endDate}`

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    timeoutMs
  })

  if (!response || !response.ok) return []

  try {
    const payload = (await response.json()) as BcrpResponse
    const periods = Array.isArray(payload.periods) ? payload.periods : []

    return periods
  } catch {
    return []
  }
}

export const bcrpAdapter: FxProviderAdapter = {
  code: 'bcrp',
  displayName: 'BCRP Estadísticas (Perú — PD04640PD historical)',
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
      // 7-day lookback window so weekends/holidays resolve to the last
      // published weekday.
      const startDate = shiftIsoDate(requestedDate, -7)
      const periods = await fetchBcrpRange(startDate, requestedDate)

      if (periods.length === 0) return null

      let bestRate: number | null = null
      let bestDate: string | null = null

      for (const period of periods) {
        const parsedRate = parseRate(period.values?.[0])
        const normalizedDate = normalizeRateDate(period.name ?? null)

        if (parsedRate === null || !normalizedDate) continue
        if (normalizedDate > requestedDate) continue

        if (!bestDate || normalizedDate > bestDate) {
          bestDate = normalizedDate
          bestRate = parsedRate
        }
      }

      if (bestRate === null || !bestDate) return null

      // Raw value is PEN per USD. Invert for PEN→USD.
      const rate = from === 'USD' && to === 'PEN' ? bestRate : 1 / bestRate

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(rate),
        rateDate: bestDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, bestDate),
        source: 'bcrp:PD04640PD',
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

    try {
      const periods = await fetchBcrpRange(startDate, endDate)

      if (periods.length === 0) return []

      const results: FxRateFetchResult[] = []

      for (const period of periods) {
        const parsedRate = parseRate(period.values?.[0])
        const normalizedDate = normalizeRateDate(period.name ?? null)

        if (parsedRate === null || !normalizedDate) continue

        const rate = from === 'USD' && to === 'PEN' ? parsedRate : 1 / parsedRate

        results.push({
          fromCurrency: from,
          toCurrency: to,
          rate: roundCurrency(rate),
          rateDate: normalizedDate,
          requestedDate: normalizedDate,
          isCarried: false,
          source: 'bcrp:PD04640PD',
          publishedAt: null
        })
      }

      return results
    } catch {
      return []
    }
  },

  async ping() {
    const start = Date.now()
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = shiftIsoDate(today, -1)

    try {
      const response = await fetchWithRetry(`${BCRP_BASE_URL}/${yesterday}/${today}`, {
        headers: { Accept: 'application/json' },
        timeoutMs: 5000,
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
