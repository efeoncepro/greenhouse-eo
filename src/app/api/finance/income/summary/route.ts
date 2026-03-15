import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface IncomeSummaryRow {
  invoice_date: unknown
  total_amount_clp: unknown
  exchange_rate_to_clp: unknown
  payments_received: unknown
  payment_status: string
  amount_paid: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureFinanceInfrastructure()

    const projectId = getFinanceProjectId()
    const monthKeys = getRecentMonthKeys(6)

    const rows = await runFinanceQuery<IncomeSummaryRow>(`
      SELECT invoice_date, total_amount_clp, exchange_rate_to_clp, payments_received, payment_status, amount_paid
      FROM \`${projectId}.greenhouse.fin_income\`
    `)

    const accrualEntries = rows
      .map(row => ({
        period: getMonthKey(toDateString(row.invoice_date as string | { value?: string } | null)),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period))

    const cashEntries = rows.flatMap(row =>
      toIncomePaymentCashEntries({
        exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
        paymentsReceived: row.payments_received
      }).map(payment => ({
        period: getMonthKey(payment.paymentDate),
        amountClp: payment.amountClp
      }))
    ).filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period))

    const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
    const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)
    const accrualCurrentMonth = buildCurrentMonthMetrics(accrualMonthlySeries)
    const cashCurrentMonth = buildCurrentMonthMetrics(cashMonthlySeries)

    const cashDataQuality = {
      paidInvoicesWithoutPaymentEvents: rows.filter(row => {
        const paymentStatus = row.payment_status

        return ['paid', 'partial'].includes(paymentStatus) && toIncomePaymentCashEntries({
          exchangeRateToClp: toNumber(row.exchange_rate_to_clp),
          paymentsReceived: row.payments_received
        }).length === 0 && toNumber(row.amount_paid) > 0
      }).length
    }

    return NextResponse.json({
      currentMonth: {
        totalAmountClp: accrualCurrentMonth.totalAmountClp,
        invoiceCount: accrualCurrentMonth.recordCount,
        changePercent: accrualCurrentMonth.changePercent,
        trend: accrualCurrentMonth.totalAmountClp >= accrualCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      monthly: accrualMonthlySeries.map(point => ({
        year: point.year,
        month: point.month,
        totalAmountClp: point.totalAmountClp,
        invoiceCount: point.recordCount
      })),
      accrualCurrentMonth: {
        totalAmountClp: accrualCurrentMonth.totalAmountClp,
        invoiceCount: accrualCurrentMonth.recordCount,
        changePercent: accrualCurrentMonth.changePercent,
        trend: accrualCurrentMonth.totalAmountClp >= accrualCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      accrualMonthly: accrualMonthlySeries.map(point => ({
        year: point.year,
        month: point.month,
        totalAmountClp: point.totalAmountClp,
        invoiceCount: point.recordCount
      })),
      cashCurrentMonth: {
        totalAmountClp: cashCurrentMonth.totalAmountClp,
        paymentCount: cashCurrentMonth.recordCount,
        changePercent: cashCurrentMonth.changePercent,
        trend: cashCurrentMonth.totalAmountClp >= cashCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      cashMonthly: cashMonthlySeries.map(point => ({
        year: point.year,
        month: point.month,
        totalAmountClp: point.totalAmountClp,
        paymentCount: point.recordCount
      })),
      cashDataQuality
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/income/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
