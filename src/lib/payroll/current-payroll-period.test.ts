import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import {
  getPayrollCalculationDeadlineStatus,
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

  it('returns the matching operational month when it is still open', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'draft')
      ],
      '2026-03-28T12:00:00.000Z'
    )

    expect(current?.periodId).toBe('2026-03')
  })

  it('returns null when the current operational month is already exported, even if an earlier period remains approved', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'exported')
      ],
      '2026-03-28T12:00:00.000Z'
    )

    expect(current).toBeNull()
  })

  it('rolls back to the prior month while the close window is still open', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'draft')
      ],
      '2026-04-08T02:00:00.000Z'
    )

    expect(current?.periodId).toBe('2026-03')
  })

  it('computes deadline state for an uncalculated period on its last business day', () => {
    const status = getPayrollCalculationDeadlineStatus(
      buildPeriod('2026-03', 'draft'),
      '2026-03-31T15:00:00.000Z'
    )

    expect(status.deadlineDate).toBe('2026-03-31')
    expect(status.isDue).toBe(true)
    expect(status.state).toBe('due')
  })

  it('detects when a period was calculated on time', () => {
    const status = getPayrollCalculationDeadlineStatus(
      {
        ...buildPeriod('2026-03', 'calculated'),
        calculatedAt: '2026-03-31T13:00:00.000Z'
      },
      '2026-04-01T12:00:00.000Z'
    )

    expect(status.calculatedOnTime).toBe(true)
    expect(status.state).toBe('calculated_on_time')
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
