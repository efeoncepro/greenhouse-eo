import { describe, expect, it } from 'vitest'

import {
  canEditPayrollPeriodMetadata,
  canEditPayrollEntries,
  canRecalculatePayrollPeriod,
  canSetPayrollPeriodApproved,
  canSetPayrollPeriodCalculated,
  canSetPayrollPeriodExported,
  doesPayrollPeriodUpdateRequireReset,
  isPayrollPeriodFinalized,
  shouldReopenApprovedPayrollPeriod
} from './period-lifecycle'

describe('payroll period lifecycle', () => {
  it('allows calculation for draft, calculated, and approved periods', () => {
    expect(canSetPayrollPeriodCalculated('draft')).toBe(true)
    expect(canSetPayrollPeriodCalculated('calculated')).toBe(true)
    expect(canSetPayrollPeriodCalculated('approved')).toBe(true)
    expect(canSetPayrollPeriodCalculated('exported')).toBe(false)
  })

  it('only allows approval from the calculated state', () => {
    expect(canSetPayrollPeriodApproved('draft')).toBe(false)
    expect(canSetPayrollPeriodApproved('calculated')).toBe(true)
    expect(canSetPayrollPeriodApproved('approved')).toBe(false)
    expect(canSetPayrollPeriodApproved('exported')).toBe(false)
  })

  it('only allows export from the approved state', () => {
    expect(canSetPayrollPeriodExported('draft')).toBe(false)
    expect(canSetPayrollPeriodExported('calculated')).toBe(false)
    expect(canSetPayrollPeriodExported('approved')).toBe(true)
    expect(canSetPayrollPeriodExported('exported')).toBe(false)
  })

  it('allows recalculation for draft, calculated, and approved periods', () => {
    expect(canRecalculatePayrollPeriod('draft')).toBe(true)
    expect(canRecalculatePayrollPeriod('calculated')).toBe(true)
    expect(canRecalculatePayrollPeriod('approved')).toBe(true)
  })

  it('treats exported periods as finalized', () => {
    expect(isPayrollPeriodFinalized('exported')).toBe(true)
    expect(canRecalculatePayrollPeriod('exported')).toBe(false)
  })

  it('allows entry editing only while the period is calculated', () => {
    expect(canEditPayrollEntries('calculated')).toBe(true)
    expect(canEditPayrollEntries('approved')).toBe(false)
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
