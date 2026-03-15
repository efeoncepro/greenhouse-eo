import { NextResponse } from 'next/server'

import { aggregateMonthlyEntries, buildCurrentMonthMetrics, getMonthKey, getRecentMonthKeys } from '@/lib/finance/reporting'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toDateString, toNumber } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface ExpenseSummaryRow {
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

  try {
    await ensureFinanceInfrastructure()

    const projectId = getFinanceProjectId()
    const monthKeys = getRecentMonthKeys(6)

    const rows = await runFinanceQuery<ExpenseSummaryRow>(`
      SELECT document_date, payment_date, total_amount_clp, payment_status
      FROM \`${projectId}.greenhouse.fin_expenses\`
    `)

    const legacyEntries = rows
      .map(row => ({
        period: getMonthKey(
          toDateString((row.document_date || row.payment_date) as string | { value?: string } | null)
        ),
        amountClp: roundCurrency(toNumber(row.total_amount_clp))
      }))
      .filter((entry): entry is { period: string; amountClp: number } => Boolean(entry.period))

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

    const legacyMonthlySeries = aggregateMonthlyEntries(legacyEntries, monthKeys)
    const accrualMonthlySeries = aggregateMonthlyEntries(accrualEntries, monthKeys)
    const cashMonthlySeries = aggregateMonthlyEntries(cashEntries, monthKeys)
    const legacyCurrentMonth = buildCurrentMonthMetrics(legacyMonthlySeries)
    const accrualCurrentMonth = buildCurrentMonthMetrics(accrualMonthlySeries)
    const cashCurrentMonth = buildCurrentMonthMetrics(cashMonthlySeries)

    const cashDataQuality = {
      paidExpensesWithoutPaymentDate: rows.filter(row =>
        row.payment_status === 'paid' && !toDateString(row.payment_date as string | { value?: string } | null)
      ).length
    }

    return NextResponse.json({
      currentMonth: {
        totalAmountClp: legacyCurrentMonth.totalAmountClp,
        expenseCount: legacyCurrentMonth.recordCount,
        changePercent: legacyCurrentMonth.changePercent,
        trend: legacyCurrentMonth.totalAmountClp <= legacyCurrentMonth.previousTotalAmountClp ? 'positive' : 'negative'
      },
      monthly: legacyMonthlySeries.map(point => ({
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
      cashDataQuality
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'

    console.error('GET /api/finance/expenses/summary failed:', detail, error)

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
