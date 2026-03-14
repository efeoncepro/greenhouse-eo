import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, runFinanceQuery, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface SummaryRow {
  income_month: unknown
  income_prev: unknown
  expenses_month: unknown
  expenses_prev: unknown
  receivables: unknown
  receivable_invoices: unknown
  payables: unknown
  payable_count: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<SummaryRow>(`
    SELECT
      -- Income this month (paid or partial)
      (SELECT COALESCE(SUM(total_amount_clp), 0)
       FROM \`${projectId}.greenhouse.fin_income\`
       WHERE payment_status IN ('paid', 'partial')
         AND FORMAT_DATE('%Y-%m', invoice_date) = FORMAT_DATE('%Y-%m', CURRENT_DATE())
      ) AS income_month,

      -- Income previous month
      (SELECT COALESCE(SUM(total_amount_clp), 0)
       FROM \`${projectId}.greenhouse.fin_income\`
       WHERE payment_status IN ('paid', 'partial')
         AND FORMAT_DATE('%Y-%m', invoice_date) = FORMAT_DATE('%Y-%m', DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      ) AS income_prev,

      -- Expenses this month (paid)
      (SELECT COALESCE(SUM(total_amount_clp), 0)
       FROM \`${projectId}.greenhouse.fin_expenses\`
       WHERE payment_status = 'paid'
         AND FORMAT_DATE('%Y-%m', COALESCE(payment_date, document_date)) = FORMAT_DATE('%Y-%m', CURRENT_DATE())
      ) AS expenses_month,

      -- Expenses previous month
      (SELECT COALESCE(SUM(total_amount_clp), 0)
       FROM \`${projectId}.greenhouse.fin_expenses\`
       WHERE payment_status = 'paid'
         AND FORMAT_DATE('%Y-%m', COALESCE(payment_date, document_date)) = FORMAT_DATE('%Y-%m', DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      ) AS expenses_prev,

      -- Accounts receivable
      (SELECT COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0)
       FROM \`${projectId}.greenhouse.fin_income\`
       WHERE payment_status IN ('pending', 'overdue', 'partial')
      ) AS receivables,

      (SELECT COUNT(*)
       FROM \`${projectId}.greenhouse.fin_income\`
       WHERE payment_status IN ('pending', 'overdue')
      ) AS receivable_invoices,

      -- Accounts payable
      (SELECT COALESCE(SUM(total_amount_clp), 0)
       FROM \`${projectId}.greenhouse.fin_expenses\`
       WHERE payment_status = 'pending'
      ) AS payables,

      (SELECT COUNT(*)
       FROM \`${projectId}.greenhouse.fin_expenses\`
       WHERE payment_status = 'pending'
      ) AS payable_count
  `)

  const row = rows[0] || {}
  const incomeMonth = toNumber(row.income_month)
  const incomePrev = toNumber(row.income_prev)
  const expensesMonth = toNumber(row.expenses_month)
  const expensesPrev = toNumber(row.expenses_prev)

  return NextResponse.json({
    incomeMonth,
    incomePrev,
    incomeTrend: incomePrev > 0 ? Math.round(((incomeMonth - incomePrev) / incomePrev) * 100) : 0,
    expensesMonth,
    expensesPrev,
    expensesTrend: expensesPrev > 0 ? Math.round(((expensesMonth - expensesPrev) / expensesPrev) * 100) : 0,
    netFlow: incomeMonth - expensesMonth,
    receivables: toNumber(row.receivables),
    receivableInvoices: toNumber(row.receivable_invoices),
    payables: toNumber(row.payables),
    payableCount: toNumber(row.payable_count)
  })
}
