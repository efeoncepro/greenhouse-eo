// Mindicador.cl adapter (Chilean official indicators proxy).
//
// This adapter wraps the existing fetchMindicadorUsdToClp logic that ran
// daily before TASK-484. Behavior must be identical for USD↔CLP so the
// 23:05 UTC cron keeps working the same.
//
// Mindicador supports more than USD↔CLP (UF, UTM, IPC) but this adapter
// exposes only currency pairs. CLF (UF) is materialized via the
// `clf-from-indicators` adapter instead so we don't duplicate fetching.

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

const MINDICADOR_BASE_URL = 'https://mindicador.cl/api'

const formatDateAsMindicador = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-')

  return `${day}-${month}-${year}`
}

const buildHistoricalLookupDates = (requestedDate: string, lookbackDays = 7) => {
  const baseDate = new Date(`${requestedDate}T00:00:00Z`)

  if (Number.isNaN(baseDate.getTime())) return [requestedDate]

  return Array.from({ length: Math.max(1, lookbackDays + 1) }, (_, offset) => {
    const candidate = new Date(baseDate)

    candidate.setUTCDate(baseDate.getUTCDate() - offset)

    return candidate.toISOString().slice(0, 10)
  })
}

// Low-level fetch for a single date. Returns the rate + published date or null.
const fetchMindicadorDolar = async (
  rateDate?: string | null
): Promise<{ rate: number; rateDate: string } | null> => {
  const path = rateDate
    ? `/dolar/${formatDateAsMindicador(rateDate)}`
    : '/dolar'

  const response = await fetchWithRetry(`${MINDICADOR_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    timeoutMs: 6000
  })

  if (!response || !response.ok) return null

  const payload = (await response.json()) as {
    serie?: Array<{ fecha?: string; valor?: number }>
  }

  const latest = Array.isArray(payload.serie) ? payload.serie[0] : null
  const rawValue = latest?.valor
  const fetchedDate = normalizeRateDate(latest?.fecha ?? null) ?? rateDate ?? null

  if (!isValidRateValue(rawValue) || !fetchedDate) return null

  return { rate: roundCurrency(rawValue), rateDate: fetchedDate }
}

export const mindicadorAdapter: FxProviderAdapter = {
  code: 'mindicador',
  displayName: 'Mindicador (Chile — Banco Central)',
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
    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    // Mindicador's /dolar endpoint gives USD→CLP. Accept USD→CLP and
    // CLP→USD (we invert client-side).
    if (!((from === 'USD' && to === 'CLP') || (from === 'CLP' && to === 'USD'))) {
      return null
    }

    // Historical lookback pattern preserved from exchange-rates.ts:
    // try exact → walk back up to 7 days → latest.
    let result: { rate: number; rateDate: string } | null = null

    if (rateDate) {
      for (const lookupDate of buildHistoricalLookupDates(requestedDate)) {
        result = await fetchMindicadorDolar(lookupDate)
        if (result) break
      }
    }

    if (!result) {
      result = await fetchMindicadorDolar(rateDate)
    }

    if (!result && rateDate) {
      result = await fetchMindicadorDolar(null)
    }

    if (!result) return null

    // Normalize to the requested pair (invert if needed)
    const usdToClp = result.rate
    const rate = from === 'USD' && to === 'CLP' ? usdToClp : 1 / usdToClp

    return {
      fromCurrency: from,
      toCurrency: to,
      rate,
      rateDate: result.rateDate,
      requestedDate,
      isCarried: deriveIsCarried(requestedDate, result.rateDate),
      source: 'mindicador',
      publishedAt: null
    }
  },

  async fetchHistoricalRange({
    fromCurrency,
    toCurrency,
    startDate,
    endDate
  }: FxRateHistoricalRangeInput): Promise<FxRateFetchResult[]> {
    // Mindicador historical is per-year. For a range we iterate days —
    // ok for small ranges (90 days). Year-wide backfills should use a
    // bulk endpoint (future improvement).
    const results: FxRateFetchResult[] = []
    const current = new Date(`${startDate}T00:00:00Z`)
    const end = new Date(`${endDate}T00:00:00Z`)

    while (current <= end) {
      const dateIso = current.toISOString().slice(0, 10)

      const result = await this.fetchDailyRate({
        fromCurrency,
        toCurrency,
        rateDate: dateIso
      })

      if (result) results.push(result)

      current.setUTCDate(current.getUTCDate() + 1)
    }

    return results
  },

  async ping() {
    const start = Date.now()

    const response = await fetchWithRetry(`${MINDICADOR_BASE_URL}/dolar`, {
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
