import { describe, expect, it } from 'vitest'

import { buildHistoricalMindicadorLookupDates, buildUsdClpRatePairs } from '@/lib/finance/exchange-rates'
import { invertExchangeRate } from '@/lib/finance/shared'

describe('buildHistoricalMindicadorLookupDates', () => {
  it('starts from the requested date and walks backwards', () => {
    expect(buildHistoricalMindicadorLookupDates('2026-02-28', 3)).toEqual([
      '2026-02-28',
      '2026-02-27',
      '2026-02-26',
      '2026-02-25'
    ])
  })

  it('keeps a sane fallback for invalid dates', () => {
    expect(buildHistoricalMindicadorLookupDates('invalid-date', 3)).toEqual(['invalid-date'])
  })
})

describe('invertExchangeRate', () => {
  it('preserves useful precision for CLP to USD inverse pairs', () => {
    expect(invertExchangeRate({ rate: 861.19 })).toBe(0.001161)
  })

  it('returns zero for invalid rates', () => {
    expect(invertExchangeRate({ rate: 0 })).toBe(0)
  })
})

describe('buildUsdClpRatePairs', () => {
  it('preserves precision for the inverse CLP to USD pair', () => {
    expect(buildUsdClpRatePairs({
      usdToClp: 861.19,
      rateDate: '2026-02-27',
      source: 'mindicador'
    })).toEqual([
      {
        rateId: 'USD_CLP_2026-02-27',
        fromCurrency: 'USD',
        toCurrency: 'CLP',
        rate: 861.19,
        rateDate: '2026-02-27',
        source: 'mindicador'
      },
      {
        rateId: 'CLP_USD_2026-02-27',
        fromCurrency: 'CLP',
        toCurrency: 'USD',
        rate: 0.001161,
        rateDate: '2026-02-27',
        source: 'mindicador'
      }
    ])
  })
})
