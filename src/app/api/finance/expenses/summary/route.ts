import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { runFinanceQuery, getFinanceProjectId, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface MonthlySummaryRow {
  year: unknown
  month: unknown
  total_amount_clp: unknown
  expense_count: unknown
}

interface CurrentMonthRow {
  total_amount_clp: unknown
  expense_count: unknown
  prev_total_amount_clp: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureFinanceInfrastructure()

    const projectId = getFinanceProjectId()

    const currentMonth = await runFinanceQuery<CurrentMonthRow>(`
      WITH cur_month AS (
        SELECT
          COALESCE(SUM(total_amount_clp), 0) AS total_amount_clp,
          COUNT(*) AS expense_count
        FROM \`${projectId}.greenhouse.fin_expenses\`
        WHERE EXTRACT(YEAR FROM COALESCE(document_date, payment_date)) = EXTRACT(YEAR FROM CURRENT_DATE())
          AND EXTRACT(MONTH FROM COALESCE(document_date, payment_date)) = EXTRACT(MONTH FROM CURRENT_DATE())
      ),
      prev_month AS (
        SELECT COALESCE(SUM(total_amount_clp), 0) AS prev_total_amount_clp
        FROM \`${projectId}.greenhouse.fin_expenses\`
        WHERE EXTRACT(YEAR FROM COALESCE(document_date, payment_date)) = EXTRACT(YEAR FROM DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
          AND EXTRACT(MONTH FROM COALESCE(document_date, payment_date)) = EXTRACT(MONTH FROM DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      )
      SELECT cur_month.total_amount_clp, cur_month.expense_count, prev_month.prev_total_amount_clp
      FROM cur_month, prev_month
    `)

    const monthly = await runFinanceQuery<MonthlySummaryRow>(`
      SELECT
        EXTRACT(YEAR FROM COALESCE(document_date, payment_date)) AS year,
        EXTRACT(MONTH FROM COALESCE(document_date, payment_date)) AS month,
        COALESCE(SUM(total_amount_clp), 0) AS total_amount_clp,
        COUNT(*) AS expense_count
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE COALESCE(document_date, payment_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `)

    const cur = currentMonth[0]
    const curTotal = toNumber(cur?.total_amount_clp)
    const prevTotal = toNumber(cur?.prev_total_amount_clp)
    const changePercent = prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : 0

    return NextResponse.json({
      currentMonth: {
        totalAmountClp: curTotal,
        expenseCount: toNumber(cur?.expense_count),
        changePercent,
        trend: curTotal <= prevTotal ? 'positive' : 'negative'
      },
      monthly: monthly.map(m => ({
        year: toNumber(m.year),
        month: toNumber(m.month),
        totalAmountClp: toNumber(m.total_amount_clp),
        expenseCount: toNumber(m.expense_count)
      }))
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/expenses/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
