// Banxico SIE adapter (México — FIX rate, series SF43718).
//
// SIE (Sistema de Información Económica) is the Banco de México public
// statistics API. Series SF43718 is the FIX rate, the canonical USD→MXN
// reference used for official accounting. Published weekdays only; on
// weekends/holidays we walk back up to 7 days to find the nearest
// published value.
//
// Requires BANXICO_SIE_TOKEN. When missing, the adapter short-circuits
// (returns null) so the orchestrator falls through to Frankfurter or
// Fawaz. We emit a single cold-start warning so the absence is visible
// in logs without spamming each request.

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

const BANXICO_SIE_BASE_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718'

let secretMissingWarningEmitted = false

const getToken = (): string | null => {
  const token = process.env.BANXICO_SIE_TOKEN?.trim()

  if (!token) {
    if (!secretMissingWarningEmitted) {
      console.warn('[banxico-sie] BANXICO_SIE_TOKEN not set — adapter disabled')
      secretMissingWarningEmitted = true
    }

    return null
  }

  return token
}

interface BanxicoDato {
  fecha?: string
  dato?: string
}

interface BanxicoResponse {
  bmx?: {
    series?: Array<{
      idSerie?: string
      titulo?: string
      datos?: BanxicoDato[]
    }>
  }
}

const parseRate = (raw: string | undefined | null): number | null => {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/,/g, '').trim()
  const parsed = parseFloat(cleaned)

  if (!isValidRateValue(parsed)) return null

  return parsed
}

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + deltaDays)

  return base.toISOString().slice(0, 10)
}

const fetchSeriesRange = async (
  token: string,
  fromDate: string,
  toDate: string,
  timeoutMs = 6000
): Promise<BanxicoDato[] | null> => {
  const url = `${BANXICO_SIE_BASE_URL}/datos/${fromDate}/${toDate}`

  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/json',
      'Bmx-Token': token
    },
    timeoutMs
  })

  if (!response || !response.ok) return null

  try {
    const payload = (await response.json()) as BanxicoResponse
    const series = payload.bmx?.series?.[0]
    const datos = Array.isArray(series?.datos) ? series.datos : []

    return datos
  } catch {
    return null
  }
}

export const banxicoSieAdapter: FxProviderAdapter = {
  code: 'banxico_sie',
  displayName: 'Banxico SIE (México — FIX SF43718)',
  publishedDayPattern: 'weekdays_only',
  supportsHistorical: true,
  requiresSecret: true,
  secretEnvVar: 'BANXICO_SIE_TOKEN',

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

    const token = getToken()

    if (!token) return null

    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    try {
      // Start at the requested date and walk back up to 7 days to catch
      // weekends/holidays. Banxico accepts equal from/to to request a
      // single day.
      let fromDate = shiftIsoDate(requestedDate, -7)
      let datos = await fetchSeriesRange(token, fromDate, requestedDate)

      if (!datos || datos.length === 0) {
        // Widen lookback to 14 days as a safety net (long Mexican holiday
        // windows can exceed a week).
        fromDate = shiftIsoDate(requestedDate, -14)
        datos = await fetchSeriesRange(token, fromDate, requestedDate)
      }

      if (!datos || datos.length === 0) return null

      // Pick the most recent datapoint at or before requestedDate.
      let bestRate: number | null = null
      let bestDate: string | null = null

      for (const datapoint of datos) {
        const parsedRate = parseRate(datapoint.dato)
        const normalizedDate = normalizeRateDate(datapoint.fecha ?? null)

        if (parsedRate === null || !normalizedDate) continue
        if (normalizedDate > requestedDate) continue

        if (!bestDate || normalizedDate > bestDate) {
          bestDate = normalizedDate
          bestRate = parsedRate
        }
      }

      if (bestRate === null || !bestDate) return null

      // Raw series is USD→MXN (pesos per dollar). Invert for MXN→USD.
      const rate = from === 'USD' && to === 'MXN' ? bestRate : 1 / bestRate

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(rate),
        rateDate: bestDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, bestDate),
        source: 'banxico_sie:SF43718',
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

    const token = getToken()

    if (!token) return []

    try {
      const datos = await fetchSeriesRange(token, startDate, endDate, 8000)

      if (!datos || datos.length === 0) return []

      const results: FxRateFetchResult[] = []

      for (const datapoint of datos) {
        const parsedRate = parseRate(datapoint.dato)
        const normalizedDate = normalizeRateDate(datapoint.fecha ?? null)

        if (parsedRate === null || !normalizedDate) continue

        const rate = from === 'USD' && to === 'MXN' ? parsedRate : 1 / parsedRate

        results.push({
          fromCurrency: from,
          toCurrency: to,
          rate: roundCurrency(rate),
          rateDate: normalizedDate,
          requestedDate: normalizedDate,
          isCarried: false,
          source: 'banxico_sie:SF43718',
          publishedAt: null
        })
      }

      return results
    } catch {
      return []
    }
  },

  async ping() {
    const token = getToken()

    if (!token) {
      return { reachable: false, latencyMs: null, error: 'BANXICO_SIE_TOKEN missing' }
    }

    const start = Date.now()

    try {
      const response = await fetchWithRetry(`${BANXICO_SIE_BASE_URL}/datos/oportuno`, {
        headers: {
          Accept: 'application/json',
          'Bmx-Token': token
        },
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
