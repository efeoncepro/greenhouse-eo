import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { isFinanceSlice2PostgresEnabled } from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ── Postgres types ─────────────────────────────────────────────────

interface PgIncomeRow extends Record<string, unknown> {
  invoice_date: string | Date | null
  total_amount: string | number
  total_amount_clp: string | number
  amount_paid: string | number
  payment_status: string
}

interface PgPaymentRow extends Record<string, unknown> {
  payment_date: string | Date | null
  amount_clp: string | number
}

interface PgExpenseRow extends Record<string, unknown> {
  document_date: string | Date | null
  payment_date: string | Date | null
  total_amount_clp: string | number
  payment_status: string
}

// ── BigQuery types ─────────────────────────────────────────────────

interface BqIncomeDashboardRow {
  invoice_date: unknown
  total_amount: unknown
  total_amount_clp: unknown
  amount_paid: unknown
  exchange_rate_to_clp: unknown
  payments_received: unknown
  payment_status: string
}

interface BqExpenseDashboardRow {
  document_date: unknown
  payment_date: unknown
  total_amount_clp: unknown
  payment_status: string
}

// ── Route ──────────────────────────────────────────────────────────

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const monthKeys = getRecentMonthKeys(2)
    const usePostgres = isFinanceSlice2PostgresEnabled()

    if (usePostgres) {
      return await handlePostgresFirst(monthKeys)
    }

    return await handleBigQueryFallback(monthKeys)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/dashboard/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

// ── Postgres-first path ────────────────────────────────────────────

async function handlePostgresFirst(monthKeys: string[]) {
  const [incomeRows, paymentRows, expenseRows] = await Promise.all([
    runGreenhousePostgresQuery<PgIncomeRow>(
      `SELECT invoice_date, total_amount, total_amount_clp, amount_paid, payment_status
       FROM greenhouse_finance.income`
    ),
    runGreenhousePostgresQuery<PgPaymentRow>(
      `SELECT ip.payment_date,
              ROUND(ip.amount * COALESCE(i.exchange_rate_to_clp, 1), 2) AS amount_clp
       FROM greenhouse_finance.income_payments ip
       INNER JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
       WHERE ip.payment_date IS NOT NULL AND ip.amount > 0`
    ),
    runGreenhousePostgresQuery<PgExpenseRow>(
      `SELECT document_date, payment_date, total_amount_clp, payment_status
       FROM greenhouse_finance.expenses`
    )
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
    paymentRows
      .map(row => ({
        period: getMonthKey(toDateString(row.payment_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.amount_clp))
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

  return buildResponse(incomeRows, incomeAccrualSeries, incomeCashSeries, expenseRows, expenseAccrualSeries, expenseCashSeries)
}

// ── BigQuery fallback path ─────────────────────────────────────────

async function handleBigQueryFallback(monthKeys: string[]) {
  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const [incomeRows, expenseRows] = await Promise.all([
    runFinanceQuery<BqIncomeDashboardRow>(`
      SELECT invoice_date, total_amount, total_amount_clp, amount_paid, exchange_rate_to_clp, payments_received, payment_status
      FROM \`${projectId}.greenhouse.fin_income\`
    `),
    runFinanceQuery<BqExpenseDashboardRow>(`
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

  return buildResponse(incomeRows, incomeAccrualSeries, incomeCashSeries, expenseRows, expenseAccrualSeries, expenseCashSeries)
}

// ── Shared response builder ────────────────────────────────────────

function buildResponse(
  incomeRows: Array<{ total_amount: unknown; total_amount_clp: unknown; amount_paid: unknown; payment_status: string }>,
  incomeAccrualSeries: ReturnType<typeof aggregateMonthlyEntries>,
  incomeCashSeries: ReturnType<typeof aggregateMonthlyEntries>,
  expenseRows: Array<{ total_amount_clp: unknown; payment_status: string }>,
  expenseAccrualSeries: ReturnType<typeof aggregateMonthlyEntries>,
  expenseCashSeries: ReturnType<typeof aggregateMonthlyEntries>
) {
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
