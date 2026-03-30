import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export interface SpaceFinanceMetrics {
  clientId: string
  revenueCurrentMonth: number
  revenuePreviousMonth: number
  revenueTrend: number | null
  expensesCurrentMonth: number
  marginPct: number | null
}

/**
 * Returns finance metrics (revenue, expenses, margin) per client/space
 * for the current and previous month. Used by Agency views to enrich
 * space cards with financial context.
 */
export const getSpaceFinanceMetrics = async (): Promise<SpaceFinanceMetrics[]> => {
  try {
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1
    const prevDate = new Date(curYear, curMonth - 2, 1)
    const prevYear = prevDate.getFullYear()
    const prevMonth = prevDate.getMonth() + 1

    const rows = await runGreenhousePostgresQuery<{
      client_id: string
      cur_revenue: string | number
      prev_revenue: string | number
      cur_expenses: string | number
    } & Record<string, unknown>>(
      `SELECT
         c.client_id,
         COALESCE((
           SELECT SUM(i.total_amount_clp)
           FROM greenhouse_finance.income i
           WHERE i.client_id = c.client_id
             AND EXTRACT(YEAR FROM i.invoice_date) = $1
             AND EXTRACT(MONTH FROM i.invoice_date) = $2
         ), 0) AS cur_revenue,
         COALESCE((
           SELECT SUM(i.total_amount_clp)
           FROM greenhouse_finance.income i
           WHERE i.client_id = c.client_id
             AND EXTRACT(YEAR FROM i.invoice_date) = $3
             AND EXTRACT(MONTH FROM i.invoice_date) = $4
         ), 0) AS prev_revenue,
         COALESCE((
           SELECT SUM(e.total_amount_clp)
           FROM greenhouse_finance.expenses e
           WHERE e.client_id = c.client_id
             AND EXTRACT(YEAR FROM COALESCE(e.document_date, e.payment_date)) = $1
             AND EXTRACT(MONTH FROM COALESCE(e.document_date, e.payment_date)) = $2
         ), 0) AS cur_expenses
       FROM greenhouse_core.clients c
       WHERE c.active = TRUE
       ORDER BY cur_revenue DESC`,
      [curYear, curMonth, prevYear, prevMonth]
    )

    return rows.map(r => {
      const rev = roundCurrency(toNumber(r.cur_revenue))
      const prevRev = roundCurrency(toNumber(r.prev_revenue))
      const exp = roundCurrency(toNumber(r.cur_expenses))
      const trend = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : null
      const marginPct = rev > 0 ? Math.round(((rev - exp) / rev) * 1000) / 10 : null

      return {
        clientId: String(r.client_id),
        revenueCurrentMonth: rev,
        revenuePreviousMonth: prevRev,
        revenueTrend: trend,
        expensesCurrentMonth: exp,
        marginPct
      }
    })
  } catch {
    return []
  }
}
