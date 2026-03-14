import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, runFinanceQuery, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface CashflowRow {
  period: string
  income: unknown
  expenses: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<CashflowRow>(`
    WITH months AS (
      SELECT FORMAT_DATE('%Y-%m', DATE_SUB(CURRENT_DATE(), INTERVAL offset MONTH)) AS period
      FROM UNNEST(GENERATE_ARRAY(0, 11)) AS offset
    ),
    monthly_income AS (
      SELECT FORMAT_DATE('%Y-%m', invoice_date) AS period, SUM(total_amount_clp) AS total
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE payment_status IN ('paid', 'partial')
        AND invoice_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      GROUP BY 1
    ),
    monthly_expenses AS (
      SELECT FORMAT_DATE('%Y-%m', COALESCE(payment_date, document_date)) AS period, SUM(total_amount_clp) AS total
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE payment_status = 'paid'
        AND COALESCE(payment_date, document_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      GROUP BY 1
    )
    SELECT
      m.period,
      COALESCE(i.total, 0) AS income,
      COALESCE(e.total, 0) AS expenses
    FROM months m
    LEFT JOIN monthly_income i ON i.period = m.period
    LEFT JOIN monthly_expenses e ON e.period = m.period
    ORDER BY m.period ASC
  `)

  return NextResponse.json({
    months: rows.map(r => ({
      period: r.period,
      income: toNumber(r.income),
      expenses: toNumber(r.expenses),
      net: toNumber(r.income) - toNumber(r.expenses)
    }))
  })
}
