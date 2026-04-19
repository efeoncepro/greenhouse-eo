// datos.gov.co TRM adapter (Colombia — BanRep official TRM).
//
// The TRM (Tasa Representativa del Mercado) is published by the
// Superintendencia Financiera via the Colombian open-data portal as
// Socrata dataset `32sa-8pi3`. Each row defines a window
// [vigenciadesde, vigenciahasta] during which the rate is valid — a
// single publication typically covers a weekend (Friday row covers
// Fri/Sat/Sun).
//
// For historical ranges we expand each window into N daily rows so the
// orchestrator stores one row per calendar day. For single-day queries
// we return the window that covers the requested date (with isCarried
// true when requestedDate > vigenciadesde).

import { roundCurrency } from '@/lib/finance/shared'

import {
  deriveIsCarried,
  isValidRateValue,
  type FxProviderAdapter,
  type FxRateFetchInput,
  type FxRateFetchResult,
  type FxRateHistoricalRangeInput
} from '../provider-adapter'
import { fetchWithRetry } from '../fetch-helper'

const DATOS_GOV_CO_BASE_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json'

interface TrmRow {
  valor?: string
  unidad?: string
  vigenciadesde?: string
  vigenciahasta?: string
}

const sliceIsoDate = (raw: string | undefined | null): string | null => {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()

  if (!trimmed) return null
  const sliced = trimmed.slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return null

  return sliced
}

const parseRate = (raw: string | undefined): number | null => {
  if (typeof raw !== 'string') return null
  const parsed = parseFloat(raw.trim())

  if (!isValidRateValue(parsed)) return null

  return parsed
}

const addDaysIso = (isoDate: string, delta: number): string => {
  const base = new Date(`${isoDate}T00:00:00Z`)

  if (Number.isNaN(base.getTime())) return isoDate
  base.setUTCDate(base.getUTCDate() + delta)

  return base.toISOString().slice(0, 10)
}

const clamp = (value: string, min: string, max: string): string => {
  if (value < min) return min
  if (value > max) return max

  return value
}

const fetchTrmAtOrBefore = async (requestedDate: string): Promise<TrmRow | null> => {
  const whereClause = encodeURIComponent(`vigenciadesde<='${requestedDate}T23:59:59'`)
  const url = `${DATOS_GOV_CO_BASE_URL}?$where=${whereClause}&$order=vigenciadesde DESC&$limit=1`

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000
  })

  if (!response || !response.ok) return null

  try {
    const rows = (await response.json()) as TrmRow[]

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
  } catch {
    return null
  }
}

const fetchTrmRange = async (startDate: string, endDate: string): Promise<TrmRow[]> => {
  // Include rows whose window overlaps [startDate, endDate]. We also
  // pull the one row that covers startDate (its vigenciadesde may be
  // before startDate) by extending the lower bound 10 days back.
  const lowerBound = addDaysIso(startDate, -10)

  const whereClause = encodeURIComponent(
    `vigenciadesde<='${endDate}T23:59:59' AND vigenciahasta>='${lowerBound}T00:00:00'`
  )

  const url = `${DATOS_GOV_CO_BASE_URL}?$where=${whereClause}&$order=vigenciadesde ASC&$limit=1000`

  const response = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
    timeoutMs: 8000
  })

  if (!response || !response.ok) return []

  try {
    const rows = (await response.json()) as TrmRow[]

    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export const datosGovCoTrmAdapter: FxProviderAdapter = {
  code: 'datos_gov_co_trm',
  displayName: 'Datos.gov.co TRM (Colombia — BanRep)',
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

    if (!((from === 'USD' && to === 'COP') || (from === 'COP' && to === 'USD'))) {
      return null
    }

    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    try {
      const row = await fetchTrmAtOrBefore(requestedDate)

      if (!row) return null

      const parsedRate = parseRate(row.valor)
      const vigenciadesde = sliceIsoDate(row.vigenciadesde)

      if (parsedRate === null || !vigenciadesde) return null

      // Raw value is COP per USD. Invert for COP→USD.
      const rate = from === 'USD' && to === 'COP' ? parsedRate : 1 / parsedRate

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundCurrency(rate),
        rateDate: vigenciadesde,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, vigenciadesde),
        source: 'datos_gov_co_trm',
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

    if (!((from === 'USD' && to === 'COP') || (from === 'COP' && to === 'USD'))) {
      return []
    }

    try {
      const rows = await fetchTrmRange(startDate, endDate)

      if (rows.length === 0) return []

      const results: FxRateFetchResult[] = []
      const seen = new Set<string>()

      for (const row of rows) {
        const parsedRate = parseRate(row.valor)
        const desde = sliceIsoDate(row.vigenciadesde)
        const hasta = sliceIsoDate(row.vigenciahasta)

        if (parsedRate === null || !desde || !hasta) continue

        const windowStart = clamp(desde, startDate, endDate)
        const windowEnd = clamp(hasta, startDate, endDate)

        if (windowStart > windowEnd) continue

        const rate = from === 'USD' && to === 'COP' ? parsedRate : 1 / parsedRate
        const roundedRate = roundCurrency(rate)

        let cursor = windowStart

        while (cursor <= windowEnd) {
          if (!seen.has(cursor)) {
            results.push({
              fromCurrency: from,
              toCurrency: to,
              rate: roundedRate,
              rateDate: desde,
              requestedDate: cursor,
              isCarried: cursor > desde,
              source: 'datos_gov_co_trm',
              publishedAt: null
            })
            seen.add(cursor)
          }

          cursor = addDaysIso(cursor, 1)
        }
      }

      return results
    } catch {
      return []
    }
  },

  async ping() {
    const start = Date.now()

    try {
      const response = await fetchWithRetry(`${DATOS_GOV_CO_BASE_URL}?$limit=1`, {
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
