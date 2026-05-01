import { describe, expect, it } from 'vitest'

import { getPayrollPeriodEndDate, getPayrollPeriodRange, PayrollValidationError } from '@/lib/payroll/shared'

describe('getPayrollPeriodRange', () => {
  it('returns the real end of month for 30-day months', () => {
    expect(getPayrollPeriodRange(2026, 4)).toMatchObject({
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      periodEndExclusive: '2026-05-01'
    })
  })

  it('returns the real end of month for leap-year february', () => {
    expect(getPayrollPeriodEndDate(2024, 2)).toBe('2024-02-29')
  })

  it('throws for invalid month input', () => {
    expect(() => getPayrollPeriodRange(2026, 13)).toThrowError(PayrollValidationError)
  })
})
