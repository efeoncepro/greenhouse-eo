import { NextResponse } from 'next/server'

import { buildBusinessLineMap } from '@/lib/business-line/metadata'
import { toIncomePaymentCashEntries } from '@/lib/finance/income-payments'
import { assertFinanceBigQueryReadiness } from '@/lib/finance/schema'
import { getFinanceProjectId, roundCurrency, runFinanceQuery, toNumber } from '@/lib/finance/shared'
import { isFinanceSlice2PostgresEnabled } from '@/lib/finance/postgres-store-slice2'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
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

type LaborCostRow = Record<string, unknown>

type ServiceLineTotals = {
  cashIncome: number
  cashExpenses: number
  accrualIncome: number
  accrualExpenses: number
  laborCosts: {
    directLabor: number
    indirectLabor: number
    operational: number
    infrastructure: number
    taxSocial: number
  }
}

const getBucket = (serviceLine: string | null) => serviceLine || 'unassigned'

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await assertFinanceBigQueryReadiness({ tables: ['fin_income', 'fin_expenses'] })

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

  // Fetch cost breakdown by service_line from Postgres (if enabled)
  let laborRows: LaborCostRow[] = []

  if (isFinanceSlice2PostgresEnabled()) {
    try {
      laborRows = await runGreenhousePostgresQuery<LaborCostRow>(
        `SELECT
           service_line,
           cost_category,
           COALESCE(SUM(COALESCE(effective_cost_amount_clp, total_amount_clp)), 0) AS total_clp
         FROM greenhouse_finance.expenses
         WHERE cost_category IS NOT NULL
         GROUP BY service_line, cost_category`
      )
    } catch {
      // Non-blocking: if Postgres is unavailable, proceed without labor data
    }
  }

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
      accrualExpenses: 0,
      laborCosts: {
        directLabor: 0,
        indirectLabor: 0,
        operational: 0,
        infrastructure: 0,
        taxSocial: 0
      }
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

  // Merge labor cost data by service line
  for (const row of laborRows) {
    const sl = String(row['service_line'] || 'unassigned')
    const cat = String(row['cost_category'] || 'operational')
    const amount = toNumber(row['total_clp'])
    const bucket = ensureBucket(sl)

    if (cat === 'direct_labor') bucket.laborCosts.directLabor = roundCurrency(bucket.laborCosts.directLabor + amount)
    else if (cat === 'indirect_labor') bucket.laborCosts.indirectLabor = roundCurrency(bucket.laborCosts.indirectLabor + amount)
    else if (cat === 'infrastructure') bucket.laborCosts.infrastructure = roundCurrency(bucket.laborCosts.infrastructure + amount)
    else if (cat === 'tax_social') bucket.laborCosts.taxSocial = roundCurrency(bucket.laborCosts.taxSocial + amount)
    else bucket.laborCosts.operational = roundCurrency(bucket.laborCosts.operational + amount)
  }

  // Enrich with business line metadata (label, color, loop phase)
  let blMap: Map<string, { label: string; colorHex: string; loopPhase: string | null }> | null = null

  try {
    blMap = await buildBusinessLineMap()
  } catch {
    // Non-blocking: if metadata table doesn't exist yet, proceed without enrichment
  }

  const serviceLines = Array.from(totalsByServiceLine.entries())
    .map(([serviceLine, totals]) => {
      const meta = blMap?.get(serviceLine)

      return {
        serviceLine,
        label: meta?.label || serviceLine,
        colorHex: meta?.colorHex || null,
        loopPhase: meta?.loopPhase || null,
        income: totals.cashIncome,
        expenses: totals.cashExpenses,
        net: totals.cashIncome - totals.cashExpenses,
        cashIncome: totals.cashIncome,
        cashExpenses: totals.cashExpenses,
        cashNet: totals.cashIncome - totals.cashExpenses,
        accrualIncome: totals.accrualIncome,
        accrualExpenses: totals.accrualExpenses,
        accrualNet: totals.accrualIncome - totals.accrualExpenses,
        laborCosts: totals.laborCosts
      }
    })
    .sort((left, right) => right.cashIncome - left.cashIncome)

  return NextResponse.json({ serviceLines })
}
