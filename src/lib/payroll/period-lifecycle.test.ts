import { describe, expect, it } from 'vitest'

import {
  canEditPayrollEntries,
  canRecalculatePayrollPeriod,
  isPayrollPeriodFinalized,
  shouldReopenApprovedPayrollPeriod
} from './period-lifecycle'

describe('payroll period lifecycle', () => {
  it('allows recalculation for draft, calculated, and approved periods', () => {
    expect(canRecalculatePayrollPeriod('draft')).toBe(true)
    expect(canRecalculatePayrollPeriod('calculated')).toBe(true)
    expect(canRecalculatePayrollPeriod('approved')).toBe(true)
  })

  it('treats exported periods as finalized', () => {
    expect(isPayrollPeriodFinalized('exported')).toBe(true)
    expect(canRecalculatePayrollPeriod('exported')).toBe(false)
  })

  it('allows entry editing while the period is calculated or approved', () => {
    expect(canEditPayrollEntries('calculated')).toBe(true)
    expect(canEditPayrollEntries('approved')).toBe(true)
    expect(canEditPayrollEntries('draft')).toBe(false)
    expect(canEditPayrollEntries('exported')).toBe(false)
  })

  it('reopens approved periods to calculated after a manual mutation', () => {
    expect(shouldReopenApprovedPayrollPeriod('approved')).toBe(true)
    expect(shouldReopenApprovedPayrollPeriod('calculated')).toBe(false)
    expect(shouldReopenApprovedPayrollPeriod('exported')).toBe(false)
  })
})
