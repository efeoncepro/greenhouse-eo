import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

type TrendRow = Record<string, unknown> & {
  period_year: string | number
  period_month: string | number
  category: string
  total_clp: string | number
}

type PayrollTrendRow = Record<string, unknown> & {
  period_year: string | number
  period_month: string | number
  total_cost_clp: string | number
  headcount: string | number
}

type ToolRow = Record<string, unknown> & {
  supplier_name: string
  category: string
  total_clp: string | number
  transaction_count: string | number
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'expenses'
  const months = Math.min(24, Math.max(1, toNum(searchParams.get('months') || '12')))

  try {
    if (type === 'expenses') {
      const rows = await runGreenhousePostgresQuery<TrendRow>(
        `SELECT
           EXTRACT(YEAR FROM COALESCE(document_date, payment_date))::int AS period_year,
           EXTRACT(MONTH FROM COALESCE(document_date, payment_date))::int AS period_month,
           COALESCE(cost_category, 'uncategorized') AS category,
           COALESCE(SUM(total_amount_clp), 0) AS total_clp
         FROM greenhouse_finance.expenses
         WHERE COALESCE(document_date, payment_date) >= (CURRENT_DATE - ($1 || ' months')::interval)::date
         GROUP BY period_year, period_month, category
         ORDER BY period_year, period_month, category`,
        [months]
      )

      const periodsMap = new Map<string, Record<string, number>>()

      for (const r of rows) {
        const key = `${toNum(r.period_year)}-${toNum(r.period_month)}`
        const existing = periodsMap.get(key) || {}

        existing[r.category] = toNum(r.total_clp)
        periodsMap.set(key, existing)
      }

      const periods = Array.from(periodsMap.entries()).map(([key, categories]) => {
        const [year, month] = key.split('-').map(Number)

        return { year, month, categories }
      })

      return NextResponse.json({ type: 'expenses', months, periods })
    }

    if (type === 'payroll') {
      const rows = await runGreenhousePostgresQuery<PayrollTrendRow>(
        `SELECT
           pp.period_year,
           pp.period_month,
           COALESCE(SUM(pe.total_cost), 0) AS total_cost_clp,
           COUNT(DISTINCT pe.member_id) AS headcount
         FROM greenhouse_payroll.payroll_entries pe
         JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
         WHERE (pp.period_year * 100 + pp.period_month) >= (
           EXTRACT(YEAR FROM (CURRENT_DATE - ($1 || ' months')::interval)) * 100 +
           EXTRACT(MONTH FROM (CURRENT_DATE - ($1 || ' months')::interval))
         )
         GROUP BY pp.period_year, pp.period_month
         ORDER BY pp.period_year, pp.period_month`,
        [months]
      )

      const periods = rows.map(r => ({
        year: toNum(r.period_year),
        month: toNum(r.period_month),
        totalCostClp: toNum(r.total_cost_clp),
        headcount: toNum(r.headcount)
      }))

      return NextResponse.json({ type: 'payroll', months, periods })
    }

    if (type === 'tools') {
      const rows = await runGreenhousePostgresQuery<ToolRow>(
        `SELECT
           COALESCE(supplier_name, description) AS supplier_name,
           COALESCE(cost_category, 'uncategorized') AS category,
           COALESCE(SUM(total_amount_clp), 0) AS total_clp,
           COUNT(*) AS transaction_count
         FROM greenhouse_finance.expenses
         WHERE cost_category IN ('software', 'infrastructure')
           AND COALESCE(document_date, payment_date) >= (CURRENT_DATE - ($1 || ' months')::interval)::date
         GROUP BY supplier_name, category
         ORDER BY total_clp DESC
         LIMIT 30`,
        [months]
      )

      const providers = rows.map(r => ({
        supplierName: r.supplier_name,
        category: r.category,
        totalClp: toNum(r.total_clp),
        transactionCount: toNum(r.transaction_count)
      }))

      return NextResponse.json({ type: 'tools', months, providers })
    }

    return NextResponse.json({ error: 'Invalid type. Use: expenses, payroll, tools' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/finance/analytics/trends failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
