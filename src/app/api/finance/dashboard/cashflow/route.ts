import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { isFinanceSlice2PostgresEnabled } from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface IncomeCashflowRow {
  invoice_date: unknown
  total_amount_clp: unknown
  exchange_rate_to_clp: unknown
  payments_received: unknown
}

interface ExpenseCashflowRow {
  document_date: unknown
  payment_date: unknown
  total_amount_clp: unknown
  payment_status: string
}

async function getPostgresCashflow(monthKeys: string[]) {
  const [pgIncomeAccrual, pgPayments, pgExpenseAccrual, pgExpenseCash] = await Promise.all([
    runGreenhousePostgresQuery<{ invoice_date: string | null; total_amount_clp: string | number }>(
      `SELECT invoice_date::text, total_amount_clp FROM greenhouse_finance.income`
    ),
    runGreenhousePostgresQuery<{ payment_date: string | null; amount: string | number; currency: string; exchange_rate_to_clp: string | number | null }>(
      `SELECT ip.payment_date::text, ip.amount, ip.currency,
              COALESCE(i.exchange_rate_to_clp, 1) AS exchange_rate_to_clp
       FROM greenhouse_finance.income_payments ip
       JOIN greenhouse_finance.income i ON i.income_id = ip.income_id`
    ),
    runGreenhousePostgresQuery<{ doc_date: string | null; total_amount_clp: string | number }>(
      `SELECT COALESCE(document_date, payment_date)::text AS doc_date, total_amount_clp
       FROM greenhouse_finance.expenses`
    ),
    runGreenhousePostgresQuery<{ payment_date: string | null; total_amount_clp: string | number }>(
      `SELECT payment_date::text, total_amount_clp
       FROM greenhouse_finance.expenses
       WHERE payment_status = 'paid' AND payment_date IS NOT NULL`
    )
  ])

  const accrualIncomeSeries = aggregateMonthlyEntries(
    pgIncomeAccrual
      .map(r => ({ period: getMonthKey(r.invoice_date?.slice(0, 10) ?? null), amountClp: roundCurrency(toNumber(r.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const cashIncomeSeries = aggregateMonthlyEntries(
    pgPayments
      .map(r => {
        const rate = toNumber(r.exchange_rate_to_clp) || 1
        const amountClp = r.currency === 'CLP' ? roundCurrency(toNumber(r.amount)) : roundCurrency(toNumber(r.amount) * rate)

        return { period: getMonthKey(r.payment_date?.slice(0, 10) ?? null), amountClp }
      })
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const accrualExpenseSeries = aggregateMonthlyEntries(
    pgExpenseAccrual
      .map(r => ({ period: getMonthKey(r.doc_date?.slice(0, 10) ?? null), amountClp: roundCurrency(toNumber(r.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const cashExpenseSeries = aggregateMonthlyEntries(
    pgExpenseCash
      .map(r => ({ period: getMonthKey(r.payment_date?.slice(0, 10) ?? null), amountClp: roundCurrency(toNumber(r.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  return { accrualIncomeSeries, cashIncomeSeries, accrualExpenseSeries, cashExpenseSeries }
}

async function getBigQueryCashflow(monthKeys: string[]) {
  await ensureFinanceInfrastructure()
  const projectId = getFinanceProjectId()

  const [incomeRows, expenseRows] = await Promise.all([
    runFinanceQuery<IncomeCashflowRow>(`
      SELECT invoice_date, total_amount_clp, exchange_rate_to_clp, payments_received
      FROM \`${projectId}.greenhouse.fin_income\`
    `),
    runFinanceQuery<ExpenseCashflowRow>(`
      SELECT document_date, payment_date, total_amount_clp, payment_status
      FROM \`${projectId}.greenhouse.fin_expenses\`
    `)
  ])

  const accrualIncomeSeries = aggregateMonthlyEntries(
    incomeRows
      .map(row => ({ period: getMonthKey(toDateString(row.invoice_date as string | { value?: string } | null)), amountClp: roundCurrency(toNumber(row.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const cashIncomeSeries = aggregateMonthlyEntries(
    incomeRows
      .flatMap(row => toIncomePaymentCashEntries({ exchangeRateToClp: toNumber(row.exchange_rate_to_clp), paymentsReceived: row.payments_received }))
      .map(payment => ({ period: getMonthKey(payment.paymentDate), amountClp: payment.amountClp }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const accrualExpenseSeries = aggregateMonthlyEntries(
    expenseRows
      .map(row => ({ period: getMonthKey(toDateString((row.document_date || row.payment_date) as string | { value?: string } | null)), amountClp: roundCurrency(toNumber(row.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  const cashExpenseSeries = aggregateMonthlyEntries(
    expenseRows
      .filter(row => row.payment_status === 'paid')
      .map(row => ({ period: getMonthKey(toDateString(row.payment_date as string | { value?: string } | null)), amountClp: roundCurrency(toNumber(row.total_amount_clp)) }))
      .filter((e): e is { period: string; amountClp: number } => Boolean(e.period)),
    monthKeys
  )

  return { accrualIncomeSeries, cashIncomeSeries, accrualExpenseSeries, cashExpenseSeries }
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const monthKeys = getRecentMonthKeys(12)
  const usePostgres = isFinanceSlice2PostgresEnabled()

  const { accrualIncomeSeries, cashIncomeSeries, accrualExpenseSeries, cashExpenseSeries } =
    usePostgres
      ? await getPostgresCashflow(monthKeys)
      : await getBigQueryCashflow(monthKeys)

  let cumulativeCash = 0

  return NextResponse.json({
    source: usePostgres ? 'postgres' : 'bigquery',
    months: monthKeys.map((period, index) => {
      const cashIncome = cashIncomeSeries[index]?.totalAmountClp ?? 0
      const cashExpenses = cashExpenseSeries[index]?.totalAmountClp ?? 0
      const accrualIncome = accrualIncomeSeries[index]?.totalAmountClp ?? 0
      const accrualExpenses = accrualExpenseSeries[index]?.totalAmountClp ?? 0
      const cashNet = cashIncome - cashExpenses

      cumulativeCash += cashNet

      return {
        period,
        income: cashIncome,
        expenses: cashExpenses,
        net: cashNet,
        cumulativeBalance: cumulativeCash,
        cashIncome,
        cashExpenses,
        cashNet,
        accrualIncome,
        accrualExpenses,
        accrualNet: accrualIncome - accrualExpenses
      }
    })
  })
}
