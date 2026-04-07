import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AccountScope,
  AccountFacetContext,
  AccountEconomicsFacet,
  AccountEconomicsPeriod,
  AccountEconomicsTrendPoint,
  AccountClientProfitability
} from '@/types/account-complete-360'

// ── Postgres row types ──

interface PeriodRow extends Record<string, unknown> {
  period_year: string | number
  period_month: string | number
  revenue: string | number
  labor: string | number
  direct: string | number
  indirect: string | number
  fte: string | number
}

interface ClosureRow extends Record<string, unknown> {
  closure_status: string | null
  period_closed: boolean | null
}

interface TrendRow extends Record<string, unknown> {
  period_year: string | number
  period_month: string | number
  revenue: string | number
  labor: string | number
  fte: string | number
}

interface ClientRow extends Record<string, unknown> {
  client_id: string
  client_name: string
  revenue: string | number
  cost: string | number
  headcount_fte: string | number | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  
return n === 0 && v !== 0 && v !== '0' ? null : n
}

// ── Period resolution ──

const resolvePeriod = (asOf: string | null): { year: number; month: number } => {
  if (asOf) {
    const d = new Date(asOf)

    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    }
  }

  const now = new Date()

  
return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// ── Sub-queries ──

const queryCurrentPeriod = async (
  organizationId: string,
  year: number,
  month: number
): Promise<{ period: PeriodRow | null; closure: ClosureRow | null }> => {
  // Run both in parallel
  const [periodRows, closureRows] = await Promise.all([
    runGreenhousePostgresQuery<PeriodRow>(`
      SELECT
        period_year, period_month,
        COALESCE(SUM(total_revenue_clp), 0) as revenue,
        COALESCE(SUM(labor_cost_clp), 0) as labor,
        COALESCE(SUM(direct_costs_clp), 0) as direct,
        COALESCE(SUM(indirect_costs_clp), 0) as indirect,
        COALESCE(SUM(headcount_fte), 0) as fte
      FROM greenhouse_serving.operational_pl_snapshots
      WHERE organization_id = $1
        AND period_year = $2 AND period_month = $3
      GROUP BY period_year, period_month
    `, [organizationId, year, month]).catch(() => [] as PeriodRow[]),

    runGreenhousePostgresQuery<ClosureRow>(`
      SELECT closure_status, period_closed
      FROM greenhouse_serving.period_closure_status
      WHERE period_year = $1 AND period_month = $2
      LIMIT 1
    `, [year, month]).catch(() => [] as ClosureRow[])
  ])

  return {
    period: periodRows[0] ?? null,
    closure: closureRows[0] ?? null
  }
}

const queryTrend = async (
  organizationId: string,
  limit: number
): Promise<TrendRow[]> =>
  runGreenhousePostgresQuery<TrendRow>(`
    SELECT period_year, period_month,
      COALESCE(SUM(total_revenue_clp), 0) as revenue,
      COALESCE(SUM(labor_cost_clp), 0) as labor,
      COALESCE(SUM(headcount_fte), 0) as fte
    FROM greenhouse_serving.operational_pl_snapshots
    WHERE organization_id = $1
    ORDER BY period_year DESC, period_month DESC
    LIMIT $2
  `, [organizationId, limit]).catch(() => [] as TrendRow[])

const queryByClient = async (
  clientIds: string[],
  year: number,
  month: number
): Promise<ClientRow[]> => {
  if (clientIds.length === 0) return []

  return runGreenhousePostgresQuery<ClientRow>(`
    SELECT ce.client_id, c.client_name,
      COALESCE(ce.total_revenue_clp, 0) as revenue,
      COALESCE(ce.labor_cost_clp + ce.direct_costs_clp + ce.indirect_costs_clp, 0) as cost,
      ce.headcount_fte
    FROM greenhouse_finance.client_economics ce
    JOIN greenhouse_core.clients c ON c.client_id = ce.client_id
    WHERE ce.client_id = ANY($1)
      AND ce.period_year = $2 AND ce.period_month = $3
    ORDER BY ce.total_revenue_clp DESC
  `, [clientIds, year, month]).catch(() => [] as ClientRow[])
}

// ── Mappers ──

const mapCurrentPeriod = (
  row: PeriodRow,
  closure: ClosureRow | null
): AccountEconomicsPeriod => {
  const revenue = toNum(row.revenue)
  const labor = toNum(row.labor)
  const direct = toNum(row.direct)
  const indirect = toNum(row.indirect)
  const totalCost = labor + direct + indirect
  const grossMargin = revenue - totalCost
  const fte = toNullNum(row.fte)

  return {
    year: toNum(row.period_year),
    month: toNum(row.period_month),
    closureStatus: closure?.closure_status ?? null,
    periodClosed: closure?.period_closed === true,
    revenueCLP: revenue,
    laborCostCLP: labor,
    directExpenseCLP: direct,
    indirectExpenseCLP: indirect,
    totalCostCLP: totalCost,
    grossMarginCLP: grossMargin,
    grossMarginPct: revenue > 0 ? Math.round((grossMargin / revenue) * 10000) / 100 : null,
    headcountFte: fte,
    revenuePerFte: fte && fte > 0 ? Math.round(revenue / fte) : null,
    costPerFte: fte && fte > 0 ? Math.round(totalCost / fte) : null
  }
}

const mapTrendPoint = (row: TrendRow): AccountEconomicsTrendPoint => {
  const revenue = toNum(row.revenue)
  const labor = toNum(row.labor)
  const grossMargin = revenue - labor
  const fte = toNullNum(row.fte)

  return {
    year: toNum(row.period_year),
    month: toNum(row.period_month),
    revenueCLP: revenue,
    laborCostCLP: labor,
    grossMarginCLP: grossMargin,
    grossMarginPct: revenue > 0 ? Math.round((grossMargin / revenue) * 10000) / 100 : null,
    headcountFte: fte
  }
}

const mapClientProfitability = (row: ClientRow): AccountClientProfitability => {
  const revenue = toNum(row.revenue)
  const cost = toNum(row.cost)
  const margin = revenue - cost

  return {
    clientId: String(row.client_id),
    clientName: String(row.client_name),
    revenueCLP: revenue,
    costCLP: cost,
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 10000) / 100 : null,
    fte: toNullNum(row.headcount_fte)
  }
}

// ── Public facet fetcher ──

export const fetchEconomicsFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountEconomicsFacet | null> => {
  const { year, month } = resolvePeriod(ctx.asOf)
  const trendLimit = ctx.limit ?? 12

  const [currentResult, trendRows, clientRows] = await Promise.all([
    queryCurrentPeriod(scope.organizationId, year, month),
    queryTrend(scope.organizationId, trendLimit),
    queryByClient(scope.clientIds, year, month)
  ])

  const currentPeriod = currentResult.period
    ? mapCurrentPeriod(currentResult.period, currentResult.closure)
    : null

  const trend = trendRows.map(mapTrendPoint)
  const byClient = clientRows.map(mapClientProfitability)

  // Return null only if there is zero data across all sub-queries
  if (!currentPeriod && trend.length === 0 && byClient.length === 0) {
    return null
  }

  return {
    currentPeriod,
    trend,
    trendPagination: { total: trend.length, limit: trendLimit, offset: 0 },
    byClient
  }
}
