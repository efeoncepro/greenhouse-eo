import { NextResponse } from 'next/server'

import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { isFinanceSlice2PostgresEnabled } from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

interface PgIncomeRow extends Record<string, unknown> {
  invoice_date: string | null
  total_amount_clp: string | number
}

interface PgPaymentRow extends Record<string, unknown> {
  payment_date: string | null
  amount: string | number
  exchange_rate_to_clp: string | number | null
  currency: string
}

async function getPostgresFirstSummary() {
  const monthKeys = getRecentMonthKeys(6)

  const [incomeRows, paymentRows] = await Promise.all([
    runGreenhousePostgresQuery<PgIncomeRow>(
      `SELECT invoice_date::text, total_amount_clp
       FROM greenhouse_finance.income`
    ),
    runGreenhousePostgresQuery<PgPaymentRow>(
      `SELECT payment_date::text, amount, currency,
              COALESCE(
                (SELECT exchange_rate_to_clp FROM greenhouse_finance.income i WHERE i.income_id = ip.income_id),
                1
              ) AS exchange_rate_to_clp
       FROM greenhouse_finance.income_payments ip`
    )
  ])

  const accrualEntries = incomeRows
    .map(row => ({
      period: getMonthKey(row.invoice_date?.slice(0, 10) ?? null),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const cashEntries = paymentRows
    .map(row => {
      const rate = toNumber(row.exchange_rate_to_clp) || 1

      const amountClp = row.currency === 'CLP'
        ? roundCurrency(toNumber(row.amount))
        : roundCurrency(toNumber(row.amount) * rate)

      return {
        period: getMonthKey(row.payment_date?.slice(0, 10) ?? null),
        amountClp
      }
    })
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
  const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)
  const accrualCurrentMonth = buildCurrentMonthMetrics(accrualMonthlySeries)
  const cashCurrentMonth = buildCurrentMonthMetrics(cashMonthlySeries)

  return { accrualMonthlySeries, cashMonthlySeries, accrualCurrentMonth, cashCurrentMonth }
}

async function getBigQueryFallbackSummary() {
  const monthKeys = getRecentMonthKeys(6)
  const projectId = getFinanceProjectId()

  await ensureFinanceInfrastructure()

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

  return { accrualMonthlySeries, cashMonthlySeries, accrualCurrentMonth, cashCurrentMonth, cashDataQuality }
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const usePostgres = isFinanceSlice2PostgresEnabled()

    const { accrualMonthlySeries, cashMonthlySeries, accrualCurrentMonth, cashCurrentMonth, cashDataQuality } =
      usePostgres
        ? { ...(await getPostgresFirstSummary()), cashDataQuality: undefined }
        : await getBigQueryFallbackSummary()

    return NextResponse.json({
      source: usePostgres ? 'postgres' : 'bigquery',
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
      ...(cashDataQuality ? { cashDataQuality } : {})
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/income/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
