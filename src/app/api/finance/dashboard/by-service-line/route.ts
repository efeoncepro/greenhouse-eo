import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toNumber } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface IncomeServiceLineRow {
  service_line: string | null
  total_amount_clp: unknown
  exchange_rate_to_clp: unknown
  payments_received: unknown
}

interface ExpenseServiceLineRow {
  service_line: string | null
  total_amount_clp: unknown
  payment_status: string
}

type ServiceLineTotals = {
  cashIncome: number
  cashExpenses: number
  accrualIncome: number
  accrualExpenses: number
}

const getBucket = (serviceLine: string | null) => serviceLine || 'unassigned'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const [incomeRows, expenseRows] = await Promise.all([
    runFinanceQuery<IncomeServiceLineRow>(`
      SELECT service_line, total_amount_clp, exchange_rate_to_clp, payments_received
      FROM \`${projectId}.greenhouse.fin_income\`
    `),
    runFinanceQuery<ExpenseServiceLineRow>(`
      SELECT service_line, total_amount_clp, payment_status
      FROM \`${projectId}.greenhouse.fin_expenses\`
    `)
  ])

  const totalsByServiceLine = new Map<string, ServiceLineTotals>()

  const ensureBucket = (serviceLine: string) => {
    const existing = totalsByServiceLine.get(serviceLine)

    if (existing) {
      return existing
    }

    const next: ServiceLineTotals = {
      cashIncome: 0,
      cashExpenses: 0,
      accrualIncome: 0,
      accrualExpenses: 0
    }

    totalsByServiceLine.set(serviceLine, next)

    return next
  }

  incomeRows.forEach(row => {
    const bucket = ensureBucket(getBucket(row.service_line))

    bucket.accrualIncome = roundCurrency(bucket.accrualIncome + toNumber(row.total_amount_clp))

    toIncomePaymentCashEntries({
      exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
      paymentsReceived: row.payments_received
    }).forEach(payment => {
      bucket.cashIncome = roundCurrency(bucket.cashIncome + payment.amountClp)
    })
  })

  expenseRows.forEach(row => {
    const bucket = ensureBucket(getBucket(row.service_line))

    bucket.accrualExpenses = roundCurrency(bucket.accrualExpenses + toNumber(row.total_amount_clp))

    if (row.payment_status === 'paid') {
      bucket.cashExpenses = roundCurrency(bucket.cashExpenses + toNumber(row.total_amount_clp))
    }
  })

  const serviceLines = Array.from(totalsByServiceLine.entries())
    .map(([serviceLine, totals]) => ({
      serviceLine,
      income: totals.cashIncome,
      expenses: totals.cashExpenses,
      net: totals.cashIncome - totals.cashExpenses,
      cashIncome: totals.cashIncome,
      cashExpenses: totals.cashExpenses,
      cashNet: totals.cashIncome - totals.cashExpenses,
      accrualIncome: totals.accrualIncome,
      accrualExpenses: totals.accrualExpenses,
      accrualNet: totals.accrualIncome - totals.accrualExpenses
    }))
    .sort((left, right) => right.cashIncome - left.cashIncome)

  return NextResponse.json({ serviceLines })
}
