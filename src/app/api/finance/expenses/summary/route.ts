import { NextResponse } from 'next/server'

import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { isFinanceSlice2PostgresEnabled } from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ExpenseSummaryRow {
  document_date: unknown
  payment_date: unknown
  total_amount_clp: unknown
  payment_status: string
}

interface PgExpenseRow extends Record<string, unknown> {
  document_date: string | null
  payment_date: string | null
  total_amount_clp: string | number
  payment_status: string | null
}

async function getPostgresFirstSummary() {
  const monthKeys = getRecentMonthKeys(6)

  const rows = await runGreenhousePostgresQuery<PgExpenseRow>(
    `SELECT document_date::text, payment_date::text, total_amount_clp, payment_status
     FROM greenhouse_finance.expenses`
  )

  const accrualEntries = rows
    .map(row => ({
      period: getMonthKey((row.document_date || row.payment_date)?.slice(0, 10) ?? null),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const cashEntries = rows
    .filter(row => row.payment_status === 'paid' && row.payment_date)
    .map(row => ({
      period: getMonthKey(row.payment_date!.slice(0, 10)),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
  const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)

  return {
    accrualMonthlySeries,
    cashMonthlySeries,
    accrualCurrentMonth: buildCurrentMonthMetrics(accrualMonthlySeries),
    cashCurrentMonth: buildCurrentMonthMetrics(cashMonthlySeries)
  }
}

async function getBigQueryFallbackSummary() {
  const monthKeys = getRecentMonthKeys(6)
  const projectId = getFinanceProjectId()

  await ensureFinanceInfrastructure()

  const rows = await runFinanceQuery<ExpenseSummaryRow>(`
    SELECT document_date, payment_date, total_amount_clp, payment_status
    FROM \`${projectId}.greenhouse.fin_expenses\`
  `)

  const accrualEntries = rows
    .map(row => ({
      period: getMonthKey(
        toDateString((row.document_date || row.payment_date) as string | { value?: string } | null)
      ),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period))

  const cashEntries = rows
    .filter(row => row.payment_status === 'paid')
    .map(row => ({
      period: getMonthKey(toDateString(row.payment_date as string | { value?: string } | null)),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period))

  const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
  const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)

  const cashDataQuality = {
    paidExpensesWithoutPaymentDate: rows.filter(row =>
      row.payment_status === 'paid' && !toDateString(row.payment_date as string | { value?: string } | null)
    ).length
  }

  return {
    accrualMonthlySeries,
    cashMonthlySeries,
    accrualCurrentMonth: buildCurrentMonthMetrics(accrualMonthlySeries),
    cashCurrentMonth: buildCurrentMonthMetrics(cashMonthlySeries),
    cashDataQuality
  }
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
        expenseCount: accrualCurrentMonth.recordCount,
        changePercent: accrualCurrentMonth.changePercent,
        trend: accrualCurrentMonth.totalAmountClp <= accrualCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      monthly: accrualMonthlySeries.map(point => ({
        year: point.year,
        month: point.month,
        totalAmountClp: point.totalAmountClp,
        expenseCount: point.recordCount
      })),
      accrualCurrentMonth: {
        totalAmountClp: accrualCurrentMonth.totalAmountClp,
        expenseCount: accrualCurrentMonth.recordCount,
        changePercent: accrualCurrentMonth.changePercent,
        trend: accrualCurrentMonth.totalAmountClp <= accrualCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      accrualMonthly: accrualMonthlySeries.map(point => ({
        year: point.year,
        month: point.month,
        totalAmountClp: point.totalAmountClp,
        expenseCount: point.recordCount
      })),
      cashCurrentMonth: {
        totalAmountClp: cashCurrentMonth.totalAmountClp,
        paymentCount: cashCurrentMonth.recordCount,
        changePercent: cashCurrentMonth.changePercent,
        trend: cashCurrentMonth.totalAmountClp <= cashCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
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

    console.error('GET /api/finance/expenses/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
