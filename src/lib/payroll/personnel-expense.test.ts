import { describe, expect, it } from 'vitest'

import { buildPersonnelExpenseReport } from './personnel-expense'

describe('buildPersonnelExpenseReport', () => {
  it('keeps CLP and USD totals separated for mixed payroll periods', () => {
    const report = buildPersonnelExpenseReport({
      periodRows: [
        {
          period_id: '2026-03',
          year: 2026,
          month: 3,
          currency: 'CLP',
          headcount: 2,
          total_gross: 3000000,
          total_net: 2400000,
          total_deductions: 600000,
          total_bonuses: 250000
        },
        {
          period_id: '2026-03',
          year: 2026,
          month: 3,
          currency: 'USD',
          headcount: 1,
          total_gross: 3200,
          total_net: 3200,
          total_deductions: 0,
          total_bonuses: 400
        }
      ],
      regimeRows: [
        {
          pay_regime: 'chile',
          currency: 'CLP',
          headcount: 2,
          gross: 3000000,
          net: 2400000
        },
        {
          pay_regime: 'international',
          currency: 'USD',
          headcount: 1,
          gross: 3200,
          net: 3200
        }
      ]
    })

    expect(report.periods).toHaveLength(1)
    expect(report.periods[0]?.hasMixedCurrency).toBe(true)
    expect(report.periods[0]?.totalsByCurrency).toEqual([
      {
        currency: 'CLP',
        gross: 3000000,
        net: 2400000,
        deductions: 600000,
        bonuses: 250000
      },
      {
        currency: 'USD',
        gross: 3200,
        net: 3200,
        deductions: 0,
        bonuses: 400
      }
    ])

    expect(report.totals.byCurrency).toEqual(report.periods[0]?.totalsByCurrency)
    expect(report.byRegime).toEqual([
      {
        regime: 'chile',
        currency: 'CLP',
        headcount: 2,
        gross: 3000000,
        net: 2400000
      },
      {
        regime: 'international',
        currency: 'USD',
        headcount: 1,
        gross: 3200,
        net: 3200
      }
    ])
  })
})
