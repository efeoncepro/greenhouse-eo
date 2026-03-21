import { describe, expect, it } from 'vitest'

import {
  canEditPayrollPeriodMetadata,
  canEditPayrollEntries,
  canRecalculatePayrollPeriod,
  doesPayrollPeriodUpdateRequireReset,
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

  it('allows metadata editing until the period is exported', () => {
    expect(canEditPayrollPeriodMetadata('draft')).toBe(true)
    expect(canEditPayrollPeriodMetadata('calculated')).toBe(true)
    expect(canEditPayrollPeriodMetadata('approved')).toBe(true)
    expect(canEditPayrollPeriodMetadata('exported')).toBe(false)
  })

  it('reopens approved periods to calculated after a manual mutation', () => {
    expect(shouldReopenApprovedPayrollPeriod('approved')).toBe(true)
    expect(shouldReopenApprovedPayrollPeriod('calculated')).toBe(false)
    expect(shouldReopenApprovedPayrollPeriod('exported')).toBe(false)
  })

  it('requires resetting calculated data when month, year, uf, or tax table changes', () => {
    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 2,
        nextUfValue: 39000,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(true)

    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 3,
        nextUfValue: 39100,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(true)

    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 3,
        nextUfValue: 39000,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(false)
  })
})
