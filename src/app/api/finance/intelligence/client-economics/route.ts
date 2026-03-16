import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { FinanceValidationError, roundCurrency, toNumber } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  assertFinanceSlice2PostgresReady,
  isFinanceSlice2PostgresEnabled
} from '@/lib/finance/postgres-store-slice2'
import {
  upsertClientEconomicsSnapshot,
  getClientEconomics,
  listClientEconomicsByPeriod
} from '@/lib/finance/postgres-store-intelligence'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1

  if (clientId) {
    const snapshot = await getClientEconomics(clientId, year, month)

    return NextResponse.json({ snapshot })
  }

  const snapshots = await listClientEconomicsByPeriod(year, month)

  return NextResponse.json({ snapshots, year, month })
}

// POST /api/finance/intelligence/client-economics?action=compute
// Computes and upserts client economics for a given period from income + cost allocations
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFinanceSlice2PostgresEnabled()) {
    return NextResponse.json({ error: 'Finance Postgres not configured' }, { status: 503 })
  }

  await assertFinanceSlice2PostgresReady()

  try {
    const body = await request.json()
    const year = toNumber(body.year) || new Date().getFullYear()
    const month = toNumber(body.month) || new Date().getMonth() + 1

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12')
    }

    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-31`

    // Revenue by client (from income, accrual basis)
    const revenueRows = await runGreenhousePostgresQuery<{
      client_id: string
      client_name: string
      total_revenue_clp: string
    }>(
      `SELECT
         COALESCE(client_id, client_profile_id) AS client_id,
         client_name,
         COALESCE(SUM(total_amount_clp), 0) AS total_revenue_clp
       FROM greenhouse_finance.income
       WHERE invoice_date >= $1::date AND invoice_date <= $2::date
         AND COALESCE(client_id, client_profile_id) IS NOT NULL
       GROUP BY COALESCE(client_id, client_profile_id), client_name`,
      [periodStart, periodEnd]
    )

    // Cost allocations by client for this period
    const allocationRows = await runGreenhousePostgresQuery<{
      client_id: string
      client_name: string
      total_allocated_clp: string
    }>(
      `SELECT
         client_id,
         client_name,
         COALESCE(SUM(allocated_amount_clp), 0) AS total_allocated_clp
       FROM greenhouse_finance.cost_allocations
       WHERE period_year = $1 AND period_month = $2
       GROUP BY client_id, client_name`,
      [year, month]
    )

    // Direct expenses by allocated_client_id
    const directExpenseRows = await runGreenhousePostgresQuery<{
      allocated_client_id: string
      total_direct_clp: string
    }>(
      `SELECT
         allocated_client_id,
         COALESCE(SUM(total_amount_clp), 0) AS total_direct_clp
       FROM greenhouse_finance.expenses
       WHERE allocated_client_id IS NOT NULL
         AND COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date
       GROUP BY allocated_client_id`,
      [periodStart, periodEnd]
    )

    // Merge all clients
    const clientMap = new Map<string, {
      clientName: string
      revenue: number
      directCosts: number
      indirectCosts: number
    }>()

    for (const row of revenueRows) {
      clientMap.set(row.client_id, {
        clientName: row.client_name,
        revenue: toNumber(row.total_revenue_clp),
        directCosts: 0,
        indirectCosts: 0
      })
    }

    for (const row of allocationRows) {
      const existing = clientMap.get(row.client_id) || {
        clientName: row.client_name,
        revenue: 0,
        directCosts: 0,
        indirectCosts: 0
      }
      existing.directCosts += toNumber(row.total_allocated_clp)
      clientMap.set(row.client_id, existing)
    }

    for (const row of directExpenseRows) {
      const existing = clientMap.get(row.allocated_client_id)

      if (existing) {
        existing.directCosts += toNumber(row.total_direct_clp)
      }
    }

    // Upsert snapshots
    const results = []

    for (const [clientId, data] of clientMap.entries()) {
      const totalCosts = roundCurrency(data.directCosts + data.indirectCosts)
      const grossMargin = roundCurrency(data.revenue - data.directCosts)
      const netMargin = roundCurrency(data.revenue - totalCosts)

      const snapshot = await upsertClientEconomicsSnapshot({
        clientId,
        clientName: data.clientName,
        periodYear: year,
        periodMonth: month,
        totalRevenueClp: data.revenue,
        directCostsClp: data.directCosts,
        indirectCostsClp: data.indirectCosts,
        grossMarginClp: grossMargin,
        grossMarginPercent: data.revenue > 0 ? roundCurrency((grossMargin / data.revenue) * 10000) / 10000 : null,
        netMarginClp: netMargin,
        netMarginPercent: data.revenue > 0 ? roundCurrency((netMargin / data.revenue) * 10000) / 10000 : null,
        headcountFte: null,
        revenuePerFte: null,
        costPerFte: null,
        notes: null
      })

      results.push(snapshot)
    }

    return NextResponse.json({
      computed: true,
      year,
      month,
      clientCount: results.length,
      snapshots: results
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
