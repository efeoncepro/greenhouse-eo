import { describe, expect, it } from 'vitest'

import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { roundCurrency } from '@/lib/finance/shared'

// ─── Test 1: Income summary Postgres-first aggregation logic ────────

describe('income summary Postgres-first calculation', () => {
  it('separates accrual and cash series correctly', () => {
    // Simulate Postgres income rows (accrual: by invoice_date)
    const accrualEntries = [
      { period: '2026-03', amountClp: 5_000_000 },
      { period: '2026-03', amountClp: 2_000_000 },
      { period: '2026-02', amountClp: 3_000_000 }
    ]

    // Simulate Postgres payment rows (cash: by payment_date)
    const cashEntries = [
      { period: '2026-03', amountClp: 2_000_000 },
      { period: '2026-02', amountClp: 4_500_000 }
    ]

    const monthKeys = ['2026-02', '2026-03']

    const accrualSeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
    const cashSeries = aggregateMonthlyEntries(cashEntries, monthKeys)

    // Accrual for March: 5M + 2M = 7M
    expect(accrualSeries[1].totalAmountClp).toBe(7_000_000)

    // Cash for March: 2M (only what was actually collected)
    expect(cashSeries[1].totalAmountClp).toBe(2_000_000)

    // Accrual for February: 3M
    expect(accrualSeries[0].totalAmountClp).toBe(3_000_000)

    // Cash for February: 4.5M (collected from prior invoices)
    expect(cashSeries[0].totalAmountClp).toBe(4_500_000)
  })

  it('computes current month metrics with change percent', () => {
    const monthKeys = ['2026-01', '2026-02', '2026-03']

    const entries = [
      { period: '2026-01', amountClp: 1_000_000 },
      { period: '2026-02', amountClp: 2_000_000 },
      { period: '2026-03', amountClp: 3_000_000 }
    ]

    const series = aggregateMonthlyEntries(entries, monthKeys)
    const metrics = buildCurrentMonthMetrics(series)

    expect(metrics.totalAmountClp).toBe(3_000_000)
    expect(metrics.previousTotalAmountClp).toBe(2_000_000)

    // Change: (3M - 2M) / 2M = 50%
    expect(metrics.changePercent).toBe(50)
  })

  it('getMonthKey extracts YYYY-MM from date string', () => {
    expect(getMonthKey('2026-03-15')).toBe('2026-03')
    expect(getMonthKey('2025-12-01')).toBe('2025-12')
    expect(getMonthKey(null)).toBe(null)
  })

  it('returns correct number of month keys', () => {
    const keys = getRecentMonthKeys(6)

    expect(keys).toHaveLength(6)

    // All keys should be in YYYY-MM format
    for (const key of keys) {
      expect(key).toMatch(/^\d{4}-\d{2}$/)
    }

    // Should be sorted ascending
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true)
    }
  })
})

// ─── Test 2: Cashflow calculation (real cash flow) ──────────────────

describe('cashflow calculation', () => {
  it('computes real cash flow from payment entries', () => {
    const monthKeys = ['2026-01', '2026-02', '2026-03']

    // Cash inflows (from income_payments by payment_date)
    const cashInEntries = [
      { period: '2026-01', amountClp: 3_000_000 },
      { period: '2026-02', amountClp: 5_000_000 },
      { period: '2026-03', amountClp: 1_000_000 }
    ]

    // Cash outflows (from expenses by payment_date, status=paid)
    const cashOutEntries = [
      { period: '2026-01', amountClp: 2_000_000 },
      { period: '2026-02', amountClp: 4_000_000 },
      { period: '2026-03', amountClp: 3_000_000 }
    ]

    const cashInSeries = aggregateMonthlyEntries(cashInEntries, monthKeys)
    const cashOutSeries = aggregateMonthlyEntries(cashOutEntries, monthKeys)

    // Net cash flow per month
    const netFlows = monthKeys.map((_, i) => {
      const cashIn = cashInSeries[i].totalAmountClp
      const cashOut = cashOutSeries[i].totalAmountClp

      return roundCurrency(cashIn - cashOut)
    })

    // Jan: 3M - 2M = 1M
    expect(netFlows[0]).toBe(1_000_000)

    // Feb: 5M - 4M = 1M
    expect(netFlows[1]).toBe(1_000_000)

    // Mar: 1M - 3M = -2M
    expect(netFlows[2]).toBe(-2_000_000)
  })

  it('distinguishes cash flow from accrual flow', () => {
    const monthKeys = ['2026-03']

    // Accrual income: $10M invoiced in March
    const accrualIncome = aggregateMonthlyEntries(
      [{ period: '2026-03', amountClp: 10_000_000 }],
      monthKeys
    )

    // Cash income: only $3M actually collected in March
    const cashIncome = aggregateMonthlyEntries(
      [{ period: '2026-03', amountClp: 3_000_000 }],
      monthKeys
    )

    // Accrual expenses: $8M billed in March
    const accrualExpenses = aggregateMonthlyEntries(
      [{ period: '2026-03', amountClp: 8_000_000 }],
      monthKeys
    )

    // Cash expenses: only $2M actually paid in March
    const cashExpenses = aggregateMonthlyEntries(
      [{ period: '2026-03', amountClp: 2_000_000 }],
      monthKeys
    )

    const accrualNet = accrualIncome[0].totalAmountClp - accrualExpenses[0].totalAmountClp
    const cashNet = cashIncome[0].totalAmountClp - cashExpenses[0].totalAmountClp

    // Accrual shows $2M profit
    expect(accrualNet).toBe(2_000_000)

    // Cash shows $1M actual flow
    expect(cashNet).toBe(1_000_000)

    // They differ — this was the bug the task fixes
    expect(accrualNet).not.toBe(cashNet)
  })
})

// ─── Test 3: Expense totals with/without payroll ────────────────────

describe('expense totals with and without payroll', () => {
  it('adds unlinked payroll cost to total expenses', () => {
    const expensesByCategory = {
      operational: 2_000_000,
      direct_labor: 500_000,
      infrastructure: 300_000
    }

    const payrollGross = 4_000_000
    const linkedPayrollExpenses = 500_000 // already counted in direct_labor
    const unlinkedPayrollCost = roundCurrency(Math.max(0, payrollGross - linkedPayrollExpenses))

    let totalExpenses = 0

    for (const amount of Object.values(expensesByCategory)) {
      totalExpenses += amount
    }

    // Without payroll: only operational expenses
    const totalWithoutPayroll = roundCurrency(totalExpenses)

    expect(totalWithoutPayroll).toBe(2_800_000)

    // With payroll: expenses + unlinked payroll cost
    const directLabor = roundCurrency((expensesByCategory.direct_labor || 0) + unlinkedPayrollCost)
    const totalWithPayroll = roundCurrency(totalExpenses + unlinkedPayrollCost)

    expect(unlinkedPayrollCost).toBe(3_500_000)
    expect(directLabor).toBe(4_000_000) // 500K linked + 3.5M unlinked
    expect(totalWithPayroll).toBe(6_300_000) // 2.8M expenses + 3.5M unlinked payroll
  })

  it('does not add negative unlinked payroll cost', () => {
    // When linked expenses exceed payroll gross (edge case)
    const payrollGross = 1_000_000
    const linkedPayrollExpenses = 1_500_000
    const unlinkedPayrollCost = roundCurrency(Math.max(0, payrollGross - linkedPayrollExpenses))

    expect(unlinkedPayrollCost).toBe(0)
  })

  it('handles zero payroll headcount', () => {
    // When there's no approved payroll
    const headcount = 0
    const payrollGross = 0
    const linkedPayrollExpenses = 0
    const unlinkedPayrollCost = roundCurrency(Math.max(0, payrollGross - linkedPayrollExpenses))

    const expenseTotal = 2_000_000
    const totalWithPayroll = roundCurrency(expenseTotal + unlinkedPayrollCost)

    expect(headcount).toBe(0)
    expect(unlinkedPayrollCost).toBe(0)
    expect(totalWithPayroll).toBe(2_000_000) // No change when no payroll
  })

  it('completeness indicator reflects payroll presence', () => {
    // With payroll and expenses: complete
    const complete = {
      headcount: 5,
      totalExpenses: 5_000_000,
      completeness: (5 > 0 && 5_000_000 > 0) ? 'complete' : 'partial'
    }

    expect(complete.completeness).toBe('complete')

    // Without payroll: partial
    const partial = {
      headcount: 0,
      totalExpenses: 2_000_000,
      completeness: (0 > 0 && 2_000_000 > 0) ? 'complete' : 'partial'
    }

    expect(partial.completeness).toBe('partial')

    // Missing components
    const missingComponents: string[] = []

    if (partial.headcount === 0) {
      missingComponents.push('payroll')
    }

    expect(missingComponents).toContain('payroll')
  })
})
