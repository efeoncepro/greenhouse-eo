import { describe, expect, it } from 'vitest'

import { getMonthDateRange } from '@/lib/finance/periods'

describe('getMonthDateRange', () => {
  it('returns the real last day for non-leap february', () => {
    expect(getMonthDateRange(2026, 2)).toEqual({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28'
    })
  })

  it('returns the leap-day for leap february', () => {
    expect(getMonthDateRange(2024, 2)).toEqual({
      periodStart: '2024-02-01',
      periodEnd: '2024-02-29'
    })
  })

  it('keeps 31-day months intact', () => {
    expect(getMonthDateRange(2026, 3)).toEqual({
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31'
    })
  })
})
