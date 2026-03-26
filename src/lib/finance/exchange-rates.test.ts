import { describe, expect, it } from 'vitest'

import { buildHistoricalMindicadorLookupDates } from '@/lib/finance/exchange-rates'

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
