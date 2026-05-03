import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber } from '@/lib/finance/shared'
import {
  assertFinanceSlice2PostgresReady,
  isFinanceSlice2PostgresEnabled
} from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'

export const dynamic = 'force-dynamic'

type PnlRow = Record<string, unknown>

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const currentPeriod = getFinanceCurrentPeriod()
  const year = Number(searchParams.get('year')) || currentPeriod.year
  const month = Number(searchParams.get('month')) || currentPeriod.month

  if (!isFinanceSlice2PostgresEnabled()) {
    return NextResponse.json({ error: 'Finance Postgres not configured' }, { status: 503 })
  }

  await assertFinanceSlice2PostgresReady()

  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-31`

  // Run all six queries in parallel
  const [incomeRows, collectedRows, expenseRows, payrollRows, linkedPayrollRows, rateRows] = await Promise.all([
    // Income for the period (accrual: by invoice_date)
    // TODO(TASK-766 follow-up): partner_share_amount es atributo del income document,
    // no del payment — fuera del alcance de TASK-766 (que cubre payments). Cuando
    // un income es non-CLP con partner_share_amount, el calculo
    // `partner_share_amount * COALESCE(exchange_rate_to_clp, 1)` puede inflar/perder
    // dependiendo de si el rate del documento sigue valido. La fix definitiva es
    // persistir `partner_share_amount_clp` en greenhouse_finance.income (mismo
    // patron que `total_amount_clp` ya persistido). Hoy Efeonce factura 100% CLP
    // por lo que el bug es latente. Cualquier multimoneda futura debe abrir
    // task derivada antes de ser desplegada.
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         COALESCE(SUM(COALESCE(effective_cost_amount_clp, total_amount_clp)), 0) AS total_clp,
         COUNT(*) AS record_count,
         COALESCE(SUM(partner_share_amount * COALESCE(exchange_rate_to_clp, 1)), 0) AS partner_share_clp
       FROM greenhouse_finance.income
       WHERE invoice_date >= $1::date AND invoice_date <= $2::date
         AND COALESCE(income_type, 'service_fee') NOT IN ('quote')
         AND COALESCE(dte_type_code, '') NOT IN ('52', 'COT')
         AND COALESCE(is_annulled, FALSE) = FALSE`,
      [periodStart, periodEnd]
    ),

    // Collected revenue in the period (cash: by payment_date in income_payments)
    // TASK-766 — canonical CLP reader. Reemplaza el anti-patron
    // `SUM(ROUND(ip.amount * COALESCE(i.exchange_rate_to_clp, 1), 2))` por
    // SELECT directo a la VIEW income_payments_normalized que expone
    // `payment_amount_clp` canonico (COALESCE chain) y filtra 3-axis supersede.
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         COALESCE(SUM(ipn.payment_amount_clp), 0) AS collected_clp,
         COUNT(*) AS payment_count
       FROM greenhouse_finance.income_payments_normalized ipn
       WHERE ipn.payment_date >= $1::date AND ipn.payment_date <= $2::date
         AND ipn.payment_amount_native > 0`,
      [periodStart, periodEnd]
    ),

    // Expenses by cost_category for the period (accrual: by document_date or payment_date)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         cost_category,
         COALESCE(SUM(COALESCE(effective_cost_amount_clp, total_amount_clp)), 0) AS total_clp,
         COUNT(*) AS record_count
       FROM greenhouse_finance.expenses
       WHERE COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date
         AND COALESCE(is_annulled, FALSE) = FALSE
       GROUP BY cost_category`,
      [periodStart, periodEnd]
    ),

    // Personnel expense from payroll — split by currency for proper conversion
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT
         COUNT(DISTINCT e.member_id) AS headcount,
         COALESCE(SUM(CASE WHEN e.currency = 'CLP' THEN e.gross_total ELSE 0 END), 0) AS gross_clp,
         COALESCE(SUM(CASE WHEN e.currency = 'USD' THEN e.gross_total ELSE 0 END), 0) AS gross_usd,
         COALESCE(SUM(CASE WHEN e.currency = 'CLP' THEN e.net_total ELSE 0 END), 0) AS net_clp,
         COALESCE(SUM(CASE WHEN e.currency = 'USD' THEN e.net_total ELSE 0 END), 0) AS net_usd,
         COALESCE(SUM(CASE WHEN e.currency = 'CLP' THEN COALESCE(e.chile_total_deductions, 0) ELSE 0 END), 0) AS deductions_clp,
         COALESCE(SUM(CASE WHEN e.currency = 'USD' THEN COALESCE(e.chile_total_deductions, 0) ELSE 0 END), 0) AS deductions_usd,
         COALESCE(SUM(CASE WHEN e.currency = 'CLP' THEN COALESCE(e.bonus_otd_amount, 0) + COALESCE(e.bonus_rpa_amount, 0) + COALESCE(e.bonus_other_amount, 0) ELSE 0 END), 0) AS bonuses_clp,
         COALESCE(SUM(CASE WHEN e.currency = 'USD' THEN COALESCE(e.bonus_otd_amount, 0) + COALESCE(e.bonus_rpa_amount, 0) + COALESCE(e.bonus_other_amount, 0) ELSE 0 END), 0) AS bonuses_usd
       FROM greenhouse_payroll.payroll_entries e
       INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
       WHERE p.year = $1 AND p.month = $2 AND p.status IN ('approved', 'exported')
         AND e.is_active = TRUE`,
      [year, month]
    ),

    // Expenses already linked to payroll entries (to avoid double-counting)
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT COALESCE(SUM(COALESCE(effective_cost_amount_clp, total_amount_clp)), 0) AS linked_clp
       FROM greenhouse_finance.expenses
       WHERE payroll_entry_id IS NOT NULL
         AND COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date
         AND COALESCE(is_annulled, FALSE) = FALSE`,
      [periodStart, periodEnd]
    ),

    // Latest USD → CLP exchange rate for payroll conversion
    runGreenhousePostgresQuery<PnlRow>(
      `SELECT rate
       FROM greenhouse_finance.exchange_rates
       WHERE from_currency = 'USD' AND to_currency = 'CLP'
       ORDER BY rate_date DESC
       LIMIT 1`
    )
  ])

  const income = incomeRows[0] || {}
  const totalRevenue = toNumber(income['total_clp'])
  const partnerShare = toNumber(income['partner_share_clp'])
  const netRevenue = roundCurrency(totalRevenue - partnerShare)

  const collected = collectedRows[0] || {}
  const collectedRevenue = roundCurrency(toNumber(collected['collected_clp']))
  const accountsReceivable = roundCurrency(totalRevenue - collectedRevenue)

  const payroll = payrollRows[0] || {}
  const usdToClp = toNumber((rateRows[0] || {})['rate']) || 1

  // Convert payroll to CLP: CLP entries stay as-is, USD entries × exchange rate
  const payrollGross = roundCurrency(
    toNumber(payroll['gross_clp']) + toNumber(payroll['gross_usd']) * usdToClp
  )

  const payrollNet = roundCurrency(
    toNumber(payroll['net_clp']) + toNumber(payroll['net_usd']) * usdToClp
  )

  const payrollDeductions = roundCurrency(
    toNumber(payroll['deductions_clp']) + toNumber(payroll['deductions_usd']) * usdToClp
  )

  const payrollBonuses = roundCurrency(
    toNumber(payroll['bonuses_clp']) + toNumber(payroll['bonuses_usd']) * usdToClp
  )

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

  const headcount = toNumber(payroll['headcount'])
  const hasPayroll = headcount > 0
  const hasExpenses = totalExpenses > 0
  const completeness: ('complete' | 'partial') = hasPayroll && hasExpenses ? 'complete' : 'partial'

  const missingComponents: string[] = []

  if (!hasPayroll) {
    missingComponents.push('payroll')
  }

  if (!hasExpenses && !hasPayroll) {
    missingComponents.push('expenses')
  }

  return NextResponse.json({
    year,
    month,
    revenue: {
      totalRevenue,
      partnerShare,
      netRevenue,
      collectedRevenue,
      accountsReceivable,
      invoiceCount: toNumber(income['record_count'])
    },
    costs: {
      directLabor,
      indirectLabor,
      operational,
      infrastructure,
      taxSocial,
      totalExpenses: roundCurrency(totalExpenses),
      unlinkedPayrollCost
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
      headcount,
      totalGross: payrollGross,
      totalNet: payrollNet,
      totalDeductions: payrollDeductions,
      totalBonuses: payrollBonuses
    },
    completeness,
    missingComponents
  })
}
