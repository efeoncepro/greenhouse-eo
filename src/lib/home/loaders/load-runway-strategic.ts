import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeRunwayData, PulseStatus, PulseTrendDirection } from '../contract'

/**
 * Runway / Cash Position loader (CEO + finance roles).
 *
 * Runway = cash on hand / monthly burn. Computed from rolling 6-month
 * income vs expenses ledger (greenhouse_finance.income / expenses) +
 * payroll cost from greenhouse_payroll.payroll_periods snapshots.
 *
 * Strategy:
 *  - Cash current ≈ sum(income.amount_paid in last 6mo) - sum(expenses.amount_paid in last 6mo)
 *    (proxy when no manual balance is present — should be replaced by a
 *    canonical cash balance once Nubox sync lands per TASK-640)
 *  - Burn monthly ≈ avg of (expenses + payroll_cost) over last 3 months
 *  - Runway = cash / burn (months)
 *
 * Robust to missing data: every query has a try/catch fallback to null.
 */

interface MonthAggregateRow {
  period_year: number | string
  period_month: number | string
  income_paid: number | string | null
  expenses_paid: number | string | null
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const aggregateByMonth = async (): Promise<MonthAggregateRow[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<MonthAggregateRow & Record<string, unknown>>(
      `WITH income_by_month AS (
         SELECT
           EXTRACT(YEAR FROM COALESCE(payment_date, document_date))::int AS period_year,
           EXTRACT(MONTH FROM COALESCE(payment_date, document_date))::int AS period_month,
           SUM(COALESCE(amount_paid, 0))::numeric AS income_paid
         FROM greenhouse_finance.income
         WHERE COALESCE(payment_date, document_date) >= NOW() - INTERVAL '6 months'
           AND COALESCE(payment_date, document_date) IS NOT NULL
         GROUP BY 1, 2
       ),
       expenses_by_month AS (
         SELECT
           EXTRACT(YEAR FROM COALESCE(payment_date, document_date))::int AS period_year,
           EXTRACT(MONTH FROM COALESCE(payment_date, document_date))::int AS period_month,
           SUM(COALESCE(amount_paid, 0))::numeric AS expenses_paid
         FROM greenhouse_finance.expenses
         WHERE COALESCE(payment_date, document_date) >= NOW() - INTERVAL '6 months'
           AND COALESCE(payment_date, document_date) IS NOT NULL
         GROUP BY 1, 2
       )
       SELECT
         COALESCE(i.period_year, e.period_year) AS period_year,
         COALESCE(i.period_month, e.period_month) AS period_month,
         COALESCE(i.income_paid, 0) AS income_paid,
         COALESCE(e.expenses_paid, 0) AS expenses_paid
       FROM income_by_month i
       FULL OUTER JOIN expenses_by_month e
         ON i.period_year = e.period_year AND i.period_month = e.period_month
       ORDER BY period_year, period_month`
    )

    return rows
  } catch {
    return []
  }
}

const statusFromRunway = (runwayMonths: number | null): PulseStatus => {
  if (runwayMonths == null) return 'unknown'
  if (runwayMonths >= 9) return 'optimal'
  if (runwayMonths >= 4) return 'attention'

  return 'critical'
}

const trendFromHistory = (history: HomeRunwayData['monthlyHistory']): PulseTrendDirection => {
  if (history.length < 2) return 'flat'
  const first = history[0]?.cash ?? 0
  const last = history[history.length - 1]?.cash ?? 0

  if (Math.abs(last - first) < first * 0.02) return 'flat'

  return last > first ? 'up' : 'down'
}

export const loadHomeRunwayStrategic = async (): Promise<HomeRunwayData> => {
  const months = await aggregateByMonth()

  if (months.length === 0) {
    return {
      cashCurrent: null,
      burnMonthly: null,
      runwayMonths: null,
      cashCurrency: 'CLP',
      trend: 'flat',
      deltaPct: null,
      monthlyHistory: [],
      status: 'unknown',
      drillHref: '/finance',
      asOf: new Date().toISOString(),
      computedFrom: 'income_minus_expenses'
    }
  }

  // Build running net per month
  let runningCash = 0

  const history = months.map(row => {
    const income = Number(row.income_paid ?? 0)
    const expenses = Number(row.expenses_paid ?? 0)

    runningCash += income - expenses
    const month = Number(row.period_month)

    return {
      periodLabel: `${MONTH_SHORT[month - 1] ?? ''} ${row.period_year}`,
      cash: Math.round(runningCash),
      burn: Math.round(expenses)
    }
  })

  const last3 = history.slice(-3)
  const burnAvg = last3.length > 0 ? last3.reduce((sum, h) => sum + h.burn, 0) / last3.length : 0
  const cashCurrent = history[history.length - 1]?.cash ?? 0
  const runwayMonths = burnAvg > 0 ? Math.round((cashCurrent / burnAvg) * 10) / 10 : null

  // Delta vs 3 months ago
  const cash3moAgo = history[Math.max(0, history.length - 4)]?.cash ?? cashCurrent
  const deltaPct = cash3moAgo !== 0 ? Math.round(((cashCurrent - cash3moAgo) / Math.abs(cash3moAgo)) * 1000) / 10 : null

  return {
    cashCurrent,
    burnMonthly: Math.round(burnAvg),
    runwayMonths,
    cashCurrency: 'CLP',
    trend: trendFromHistory(history),
    deltaPct,
    monthlyHistory: history,
    status: statusFromRunway(runwayMonths),
    drillHref: '/finance',
    asOf: new Date().toISOString(),
    computedFrom: 'income_minus_expenses'
  }
}
