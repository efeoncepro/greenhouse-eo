// CLF (Chilean UF) adapter — NOT an HTTP provider.
//
// The UF (Unidad de Fomento) is an indexed accounting unit published
// daily by Banco Central and already ingested into
// `greenhouse_finance.economic_indicators` under indicator_code = 'UF'.
// This adapter materializes synthetic CLP↔CLF rows from that table so
// the rest of the FX stack treats CLF as a regular currency without
// duplicating the Mindicador fetch.
//
// UF publishes every calendar day (including weekends), hence
// `publishedDayPattern: 'all_days'`. If the requested date has no row
// yet we return the most recent published value and mark it carried.

import { query } from '@/lib/db'
import { roundDecimal } from '@/lib/finance/shared'

import {
  deriveIsCarried,
  isValidRateValue,
  type FxProviderAdapter,
  type FxRateFetchInput,
  type FxRateFetchResult,
  type FxRateHistoricalRangeInput
} from '../provider-adapter'

const INDICATOR_CODE = 'UF'

interface IndicatorRow extends Record<string, unknown> {
  value: string | number | null
  indicator_date: string | Date | null
}

const toIsoDate = (raw: string | Date | null | undefined): string | null => {
  if (!raw) return null

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null

    return raw.toISOString().slice(0, 10)
  }

  if (typeof raw === 'string') {
    const sliced = raw.slice(0, 10)

    if (/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return sliced
    const parsed = new Date(raw)

    if (Number.isNaN(parsed.getTime())) return null

    return parsed.toISOString().slice(0, 10)
  }

  return null
}

const toUfValue = (raw: string | number | null): number | null => {
  if (raw === null || raw === undefined) return null
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw))

  if (!isValidRateValue(num)) return null

  return num
}

export const clfFromIndicatorsAdapter: FxProviderAdapter = {
  code: 'clf_from_indicators',
  displayName: 'CLF (Chilean UF from greenhouse_finance.economic_indicators)',
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

    if (!((from === 'CLP' && to === 'CLF') || (from === 'CLF' && to === 'CLP'))) {
      return null
    }

    const requestedDate = rateDate ?? new Date().toISOString().slice(0, 10)

    try {
      const rows = await query<IndicatorRow>(
        `
          SELECT value, indicator_date
          FROM greenhouse_finance.economic_indicators
          WHERE indicator_code = $1
            AND indicator_date <= $2::date
          ORDER BY indicator_date DESC
          LIMIT 1
        `,
        [INDICATOR_CODE, requestedDate]
      )

      const row = rows[0]

      if (!row) return null

      const ufValue = toUfValue(row.value as string | number | null)
      const publishedDate = toIsoDate(row.indicator_date as string | Date | null)

      if (ufValue === null || !publishedDate) return null

      // UF value is CLP per CLF. Invert for CLP→CLF.
      const rate = from === 'CLF' && to === 'CLP' ? ufValue : 1 / ufValue

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: roundDecimal(rate, 8),
        rateDate: publishedDate,
        requestedDate,
        isCarried: deriveIsCarried(requestedDate, publishedDate),
        source: 'clf_from_indicators',
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

    if (!((from === 'CLP' && to === 'CLF') || (from === 'CLF' && to === 'CLP'))) {
      return []
    }

    try {
      const rows = await query<IndicatorRow>(
        `
          SELECT value, indicator_date
          FROM greenhouse_finance.economic_indicators
          WHERE indicator_code = $1
            AND indicator_date BETWEEN $2::date AND $3::date
          ORDER BY indicator_date ASC
        `,
        [INDICATOR_CODE, startDate, endDate]
      )

      const results: FxRateFetchResult[] = []

      for (const row of rows) {
        const ufValue = toUfValue(row.value as string | number | null)
        const publishedDate = toIsoDate(row.indicator_date as string | Date | null)

        if (ufValue === null || !publishedDate) continue

        const rate = from === 'CLF' && to === 'CLP' ? ufValue : 1 / ufValue

        results.push({
          fromCurrency: from,
          toCurrency: to,
          rate: roundDecimal(rate, 8),
          rateDate: publishedDate,
          requestedDate: publishedDate,
          isCarried: false,
          source: 'clf_from_indicators',
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

    try {
      const rows = await query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.economic_indicators
          WHERE indicator_code = $1
        `,
        [INDICATOR_CODE]
      )

      const count = parseInt(rows[0]?.count ?? '0', 10)

      return {
        reachable: Number.isFinite(count) && count > 0,
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
