import { NextResponse } from 'next/server'

import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { assertFinanceBigQueryReadiness } from '@/lib/finance/schema'
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
  total_amount_clp: string | number
}

interface PgExpensePaymentRow extends Record<string, unknown> {
  payment_date: string | null
  amount: string | number
  currency: string | null
  exchange_rate_to_clp: string | number | null
}

async function getPostgresFirstSummary() {
  const monthKeys = getRecentMonthKeys(6)

  const [rows, paymentRows, missingLedgerRows] = await Promise.all([
    runGreenhousePostgresQuery<PgExpenseRow>(
      `SELECT document_date::text, total_amount_clp
       FROM greenhouse_finance.expenses`
    ),
    runGreenhousePostgresQuery<PgExpensePaymentRow>(
      `SELECT
         ep.payment_date::text,
         ep.amount,
         ep.currency,
         COALESCE(e.exchange_rate_to_clp, 1) AS exchange_rate_to_clp
       FROM greenhouse_finance.expense_payments ep
       INNER JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id`
    ),
    runGreenhousePostgresQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses e
       LEFT JOIN (
         SELECT expense_id, COUNT(*)::int AS payment_count
         FROM greenhouse_finance.expense_payments
         GROUP BY expense_id
       ) ep ON ep.expense_id = e.expense_id
       WHERE COALESCE(e.is_annulled, FALSE) = FALSE
         AND COALESCE(e.amount_paid, 0) > 0
         AND e.payment_status IN ('paid', 'partial')
         AND COALESCE(ep.payment_count, 0) = 0`
    )
  ])

  const accrualEntries = rows
    .map(row => ({
      period: getMonthKey(row.document_date?.slice(0, 10) ?? null),
      amountClp: roundCurrency(toNumber(row.total_amount_clp))
    }))
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const cashEntries = paymentRows
    .map(row => ({
      period: getMonthKey(row.payment_date?.slice(0, 10) ?? null),
      amountClp: row.currency === 'CLP' || !row.currency
        ? roundCurrency(toNumber(row.amount))
        : roundCurrency(toNumber(row.amount) * (toNumber(row.exchange_rate_to_clp) || 1))
    }))
    .filter((e): e is { period: string; amountClp: number } => Boolean(e.period))

  const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
  const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)

  return {
    accrualMonthlySeries,
    cashMonthlySeries,
    accrualCurrentMonth: buildCurrentMonthMetrics(accrualMonthlySeries),
    cashCurrentMonth: buildCurrentMonthMetrics(cashMonthlySeries),
    cashDataQuality: {
      paidExpensesWithoutPaymentEvents: Number(missingLedgerRows[0]?.count ?? 0)
    }
  }
}

async function getBigQueryFallbackSummary() {
  const monthKeys = getRecentMonthKeys(6)
  const projectId = getFinanceProjectId()

  await assertFinanceBigQueryReadiness({ tables: ['fin_expenses'] })

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
        ? await getPostgresFirstSummary()
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
