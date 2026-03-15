import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface IncomeDashboardRow {
  invoice_date: unknown
  total_amount: unknown
  total_amount_clp: unknown
  amount_paid: unknown
  exchange_rate_to_clp: unknown
  payments_received: unknown
  payment_status: string
}

interface ExpenseDashboardRow {
  document_date: unknown
  payment_date: unknown
  total_amount_clp: unknown
  payment_status: string
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()
  const monthKeys = getRecentMonthKeys(2)

  const [incomeRows, expenseRows] = await Promise.all([
    runFinanceQuery<IncomeDashboardRow>(`
      SELECT invoice_date, total_amount, total_amount_clp, amount_paid, exchange_rate_to_clp, payments_received, payment_status
      FROM \`${projectId}.greenhouse.fin_income\`
    `),
    runFinanceQuery<ExpenseDashboardRow>(`
      SELECT document_date, payment_date, total_amount_clp, payment_status
      FROM \`${projectId}.greenhouse.fin_expenses\`
    `)
  ])

  const incomeAccrualSeries = aggregateMonthlyEntries(
    incomeRows
      .map(row => ({
        period: getMonthKey(toDateString(row.invoice_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  const incomeCashSeries = aggregateMonthlyEntries(
    incomeRows
      .flatMap(row =>
        toIncomePaymentCashEntries({
          exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
          paymentsReceived: row.payments_received
        })
      )
      .map(payment => ({
        period: getMonthKey(payment.paymentDate),
        amountClp: payment.amountClp
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  const expenseAccrualSeries = aggregateMonthlyEntries(
    expenseRows
      .map(row => ({
        period: getMonthKey(
          toDateString((row.document_date || row.payment_date) as string | { value?: string } | null)
        ),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  const expenseCashSeries = aggregateMonthlyEntries(
    expenseRows
      .filter(row => row.payment_status === 'paid')
      .map(row => ({
        period: getMonthKey(toDateString(row.payment_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  const incomeCashMetrics = buildCurrentMonthMetrics(incomeCashSeries)
  const expenseCashMetrics = buildCurrentMonthMetrics(expenseCashSeries)
  const incomeAccrualMetrics = buildCurrentMonthMetrics(incomeAccrualSeries)
  const expenseAccrualMetrics = buildCurrentMonthMetrics(expenseAccrualSeries)

  const receivables = roundCurrency(
    incomeRows.reduce((sum, row) => {
      if (!['pending', 'overdue', 'partial'].includes(row.payment_status)) {
        return sum
      }

      const totalAmount = toNumber(row.total_amount)
      const amountPaid = toNumber(row.amount_paid)
      const pendingAmount = Math.max(0, totalAmount - amountPaid)

      if (pendingAmount <= 0 || totalAmount <= 0) {
        return sum
      }

      return sum + (toNumber(row.total_amount_clp) * pendingAmount) / totalAmount
    }, 0)
  )

  const receivableInvoices = incomeRows.filter(row => {
    if (!['pending', 'overdue', 'partial'].includes(row.payment_status)) {
      return false
    }

    return Math.max(0, toNumber(row.total_amount) - toNumber(row.amount_paid)) > 0
  }).length

  const payables = roundCurrency(
    expenseRows.reduce((sum, row) => (
      row.payment_status === 'pending' ? sum + toNumber(row.total_amount_clp) : sum
    ), 0)
  )

  const payableCount = expenseRows.filter(row => row.payment_status === 'pending').length

  return NextResponse.json({
    incomeMonth: incomeCashMetrics.totalAmountClp,
    incomePrev: incomeCashMetrics.previousTotalAmountClp,
    incomeTrend: incomeCashMetrics.changePercent,
    expensesMonth: expenseCashMetrics.totalAmountClp,
    expensesPrev: expenseCashMetrics.previousTotalAmountClp,
    expensesTrend: expenseCashMetrics.changePercent,
    netFlow: incomeCashMetrics.totalAmountClp - expenseCashMetrics.totalAmountClp,
    receivables,
    receivableInvoices,
    payables,
    payableCount,
    cash: {
      incomeMonth: incomeCashMetrics.totalAmountClp,
      incomePrev: incomeCashMetrics.previousTotalAmountClp,
      incomeTrend: incomeCashMetrics.changePercent,
      expensesMonth: expenseCashMetrics.totalAmountClp,
      expensesPrev: expenseCashMetrics.previousTotalAmountClp,
      expensesTrend: expenseCashMetrics.changePercent,
      netFlow: incomeCashMetrics.totalAmountClp - expenseCashMetrics.totalAmountClp
    },
    accrual: {
      incomeMonth: incomeAccrualMetrics.totalAmountClp,
      incomePrev: incomeAccrualMetrics.previousTotalAmountClp,
      incomeTrend: incomeAccrualMetrics.changePercent,
      expensesMonth: expenseAccrualMetrics.totalAmountClp,
      expensesPrev: expenseAccrualMetrics.previousTotalAmountClp,
      expensesTrend: expenseAccrualMetrics.changePercent,
      netFlow: incomeAccrualMetrics.totalAmountClp - expenseAccrualMetrics.totalAmountClp
    }
  })
}
