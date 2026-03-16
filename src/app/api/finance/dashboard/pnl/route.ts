import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber } from '@/lib/finance/shared'
import {
  assertFinanceSlice2PostgresReady,
  isFinanceSlice2PostgresEnabled
} from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

type PnlRow = Record<string, unknown>

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1

  if (!isFinanceSlice2PostgresEnabled()) {
    return NextResponse.json({ error: 'Finance Postgres not configured' }, { status: 503 })
  }

  await assertFinanceSlice2PostgresReady()

  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-31`

  // Run all four queries in parallel
  const [incomeRows, expenseRows, payrollRows, linkedPayrollRows] = await Promise.all([
    // Income for the period (accrual: by invoice_date)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         COALESCE(SUM(total_amount_clp), 0) AS total_clp,
         COUNT(*) AS record_count,
         COALESCE(SUM(partner_share_amount * COALESCE(exchange_rate_to_clp, 1)), 0) AS partner_share_clp
       FROM greenhouse_finance.income
       WHERE invoice_date >= $1::date AND invoice_date <= $2::date`,
      [periodStart, periodEnd]
    ),
    // Expenses by cost_category for the period (accrual: by document_date or payment_date)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         cost_category,
         COALESCE(SUM(total_amount_clp), 0) AS total_clp,
         COUNT(*) AS record_count
       FROM greenhouse_finance.expenses
       WHERE COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date
       GROUP BY cost_category`,
      [periodStart, periodEnd]
    ),
    // Personnel expense from payroll (approved/exported periods for this month)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         COUNT(DISTINCT e.member_id) AS headcount,
         COALESCE(SUM(e.gross_total), 0) AS total_gross,
         COALESCE(SUM(e.net_total), 0) AS total_net,
         COALESCE(SUM(COALESCE(e.chile_total_deductions, 0)), 0) AS total_deductions,
         COALESCE(SUM(COALESCE(e.bonus_otd_amount, 0) + COALESCE(e.bonus_rpa_amount, 0) + COALESCE(e.bonus_other_amount, 0)), 0) AS total_bonuses
       FROM greenhouse_payroll.payroll_entries e
       INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
       WHERE p.year = $1 AND p.month = $2 AND p.status IN ('approved', 'exported')`,
      [year, month]
    ),
    // Expenses already linked to payroll entries (to avoid double-counting)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT COALESCE(SUM(total_amount_clp), 0) AS linked_clp
       FROM greenhouse_finance.expenses
       WHERE payroll_entry_id IS NOT NULL
         AND COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date`,
      [periodStart, periodEnd]
    )
  ])

  const income = incomeRows[0] || {}
  const totalRevenue = toNumber(income['total_clp'])
  const partnerShare = toNumber(income['partner_share_clp'])
  const netRevenue = roundCurrency(totalRevenue - partnerShare)

  const payroll = payrollRows[0] || {}
  const payrollGross = toNumber(payroll['total_gross'])
  const linkedPayrollExpenses = toNumber((linkedPayrollRows[0] || {})['linked_clp'])

  // Payroll cost not yet represented as expenses → feed into directLabor
  const unlinkedPayrollCost = roundCurrency(Math.max(0, payrollGross - linkedPayrollExpenses))

  // Map expense rows by cost_category
  const expenseByCat: Record<string, number> = {}
  let totalExpenses = 0

  for (const row of expenseRows) {
    const cat = String(row['cost_category'] || 'operational')
    const amount = toNumber(row['total_clp'])
    expenseByCat[cat] = (expenseByCat[cat] || 0) + amount
    totalExpenses += amount
  }

  // Add unlinked payroll cost to labor and total expenses
  const directLabor = roundCurrency((expenseByCat['direct_labor'] || 0) + unlinkedPayrollCost)
  const indirectLabor = roundCurrency(expenseByCat['indirect_labor'] || 0)
  const operational = roundCurrency(expenseByCat['operational'] || 0)
  const infrastructure = roundCurrency(expenseByCat['infrastructure'] || 0)
  const taxSocial = roundCurrency(expenseByCat['tax_social'] || 0)

  totalExpenses = roundCurrency(totalExpenses + unlinkedPayrollCost)

  const grossMargin = roundCurrency(netRevenue - directLabor)
  const grossMarginPercent = netRevenue > 0 ? roundCurrency((grossMargin / netRevenue) * 100) : 0
  const operatingExpenses = roundCurrency(indirectLabor + operational + infrastructure)
  const ebitda = roundCurrency(grossMargin - operatingExpenses)
  const ebitdaPercent = netRevenue > 0 ? roundCurrency((ebitda / netRevenue) * 100) : 0
  const netResult = roundCurrency(netRevenue - totalExpenses)
  const netMarginPercent = netRevenue > 0 ? roundCurrency((netResult / netRevenue) * 100) : 0

  return NextResponse.json({
    year,
    month,
    revenue: {
      totalRevenue,
      partnerShare,
      netRevenue,
      invoiceCount: toNumber(income['record_count'])
    },
    costs: {
      directLabor,
      indirectLabor,
      operational,
      infrastructure,
      taxSocial,
      totalExpenses: roundCurrency(totalExpenses)
    },
    margins: {
      grossMargin,
      grossMarginPercent,
      operatingExpenses,
      ebitda,
      ebitdaPercent,
      netResult,
      netMarginPercent
    },
    payroll: {
      headcount: toNumber(payroll['headcount']),
      totalGross: toNumber(payroll['total_gross']),
      totalNet: toNumber(payroll['total_net']),
      totalDeductions: toNumber(payroll['total_deductions']),
      totalBonuses: toNumber(payroll['total_bonuses'])
    }
  })
}
