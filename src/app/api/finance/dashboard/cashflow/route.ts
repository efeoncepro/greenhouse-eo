import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
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

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()
  const monthKeys = getRecentMonthKeys(12)

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
      .map(row => ({
        period: getMonthKey(toDateString(row.invoice_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  const cashIncomeSeries = aggregateMonthlyEntries(
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

  const accrualExpenseSeries = aggregateMonthlyEntries(
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

  const cashExpenseSeries = aggregateMonthlyEntries(
    expenseRows
      .filter(row => row.payment_status === 'paid')
      .map(row => ({
        period: getMonthKey(toDateString(row.payment_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period)),
    monthKeys
  )

  return NextResponse.json({
    months: monthKeys.map((period, index) => {
      const cashIncome = cashIncomeSeries[index]?.totalAmountClp ?? 0
      const cashExpenses = cashExpenseSeries[index]?.totalAmountClp ?? 0
      const accrualIncome = accrualIncomeSeries[index]?.totalAmountClp ?? 0
      const accrualExpenses = accrualExpenseSeries[index]?.totalAmountClp ?? 0

      return {
        period,
        income: cashIncome,
        expenses: cashExpenses,
        net: cashIncome - cashExpenses,
        cashIncome,
        cashExpenses,
        cashNet: cashIncome - cashExpenses,
        accrualIncome,
        accrualExpenses,
        accrualNet: accrualIncome - accrualExpenses
      }
    })
  })
}
