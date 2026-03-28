import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import {
  getCurrentPayrollPeriod,
  getNextPayrollPeriodSuggestion,
  sortPayrollPeriodsDescending
} from './current-payroll-period'

const buildPeriod = (
  periodId: string,
  status: PayrollPeriod['status']
): PayrollPeriod => {
  const [year, month] = periodId.split('-').map(Number)

  return {
    periodId,
    year,
    month,
    status,
    calculatedAt: null,
    calculatedBy: null,
    approvedAt: null,
    approvedBy: null,
    exportedAt: null,
    ufValue: null,
    taxTableVersion: null,
    notes: null,
    createdAt: null
  }
}

describe('current-payroll-period helpers', () => {
  it('sorts periods descending by year and month', () => {
    const sorted = sortPayrollPeriodsDescending([
      buildPeriod('2026-02', 'approved'),
      buildPeriod('2026-04', 'draft'),
      buildPeriod('2025-12', 'exported')
    ])

    expect(sorted.map(period => period.periodId)).toEqual(['2026-04', '2026-02', '2025-12'])
  })

  it('returns the latest period when it is still open', () => {
    const current = getCurrentPayrollPeriod([
      buildPeriod('2026-02', 'approved'),
      buildPeriod('2026-03', 'draft')
    ])

    expect(current?.periodId).toBe('2026-03')
  })

  it('returns null when the latest chronological period is exported', () => {
    const current = getCurrentPayrollPeriod([
      buildPeriod('2026-02', 'approved'),
      buildPeriod('2026-03', 'exported')
    ])

    expect(current).toBeNull()
  })

  it('suggests the next period after the latest existing one', () => {
    const suggestion = getNextPayrollPeriodSuggestion([
      buildPeriod('2026-03', 'exported')
    ])

    expect(suggestion).toEqual({ year: 2026, month: 4 })
  })

  it('rolls over december to january', () => {
    const suggestion = getNextPayrollPeriodSuggestion([
      buildPeriod('2026-12', 'approved')
    ])

    expect(suggestion).toEqual({ year: 2027, month: 1 })
  })
})
