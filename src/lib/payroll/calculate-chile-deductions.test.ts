import { describe, expect, it } from 'vitest'

import { calculatePayrollTotals } from './calculate-chile-deductions'

describe('calculatePayrollTotals', () => {
  it('includes recurring fixed bonus in international gross and net totals', () => {
    const totals = calculatePayrollTotals({
      payRegime: 'international',
      baseSalary: 2000,
      remoteAllowance: 100,
      fixedBonusAmount: 150,
      bonusOtdAmount: 200,
      bonusRpaAmount: 50,
      bonusOtherAmount: 25
    })

    expect(totals.grossTotal).toBe(2525)
    expect(totals.netTotalCalculated).toBe(2525)
  })

  it('treats recurring fixed bonus as imponible for Chile payroll', () => {
    const totals = calculatePayrollTotals({
      payRegime: 'chile',
      baseSalary: 1000000,
      remoteAllowance: 80000,
      fixedBonusAmount: 120000,
      bonusOtdAmount: 100000,
      bonusRpaAmount: 50000,
      bonusOtherAmount: 30000,
      afpName: 'Modelo',
      afpRate: 0.1144,
      healthSystem: 'fonasa',
      unemploymentRate: 0.006,
      contractType: 'indefinido',
      hasApv: false,
      apvAmount: 0,
      ufValue: null,
      taxAmount: 50000
    })

    expect(totals.grossTotal).toBe(1380000)
    expect(totals.chileTaxableBase).toBe(1052480)
    expect(totals.netTotalCalculated).toBe(1082480)
  })
})
