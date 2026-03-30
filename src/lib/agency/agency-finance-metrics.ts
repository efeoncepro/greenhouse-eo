import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export interface SpaceFinanceMetrics {
  clientId: string
  revenueCurrentMonth: number
  revenuePreviousMonth: number
  revenueTrend: number | null
  expensesCurrentMonth: number
  marginPct: number | null
  periodYear: number | null
  periodMonth: number | null
  periodClosed: boolean
  snapshotRevision: number | null
}

/**
 * Returns finance metrics (revenue, expenses, margin) per client/space
 * for the current and previous month. Used by Agency views to enrich
 * space cards with financial context.
 */
export const getSpaceFinanceMetrics = async (): Promise<SpaceFinanceMetrics[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<{
      client_id: string
      period_year: string | number | null
      period_month: string | number | null
      period_closed: boolean | null
      snapshot_revision: string | number | null
      cur_revenue: string | number | null
      prev_revenue: string | number | null
      cur_total_cost: string | number | null
      cur_margin_pct: string | number | null
    } & Record<string, unknown>>(
      `WITH ranked_revisions AS (
         SELECT
           ops.scope_id AS client_id,
           ops.period_year,
           ops.period_month,
           ops.period_closed,
           ops.snapshot_revision,
           ops.revenue_clp,
           ops.total_cost_clp,
           ops.gross_margin_pct,
           ROW_NUMBER() OVER (
             PARTITION BY ops.scope_id, ops.period_year, ops.period_month
             ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
           ) AS revision_rank
         FROM greenhouse_serving.operational_pl_snapshots ops
         WHERE ops.scope_type = 'client'
       ),
       client_snapshots AS (
         SELECT
           rr.client_id,
           rr.period_year,
           rr.period_month,
           rr.period_closed,
           rr.snapshot_revision,
           rr.revenue_clp,
           rr.total_cost_clp,
           rr.gross_margin_pct,
           ROW_NUMBER() OVER (
             PARTITION BY rr.client_id
             ORDER BY rr.period_year DESC, rr.period_month DESC
           ) AS period_rank
         FROM ranked_revisions rr
         WHERE rr.revision_rank = 1
       )
       SELECT
         c.client_id,
         MAX(cs.period_year) FILTER (WHERE cs.period_rank = 1) AS period_year,
         MAX(cs.period_month) FILTER (WHERE cs.period_rank = 1) AS period_month,
         COALESCE(BOOL_OR(cs.period_closed) FILTER (WHERE cs.period_rank = 1), FALSE) AS period_closed,
         MAX(cs.snapshot_revision) FILTER (WHERE cs.period_rank = 1) AS snapshot_revision,
         COALESCE(MAX(cs.revenue_clp) FILTER (WHERE cs.period_rank = 1), 0) AS cur_revenue,
         COALESCE(MAX(cs.revenue_clp) FILTER (WHERE cs.period_rank = 2), 0) AS prev_revenue,
         COALESCE(MAX(cs.total_cost_clp) FILTER (WHERE cs.period_rank = 1), 0) AS cur_total_cost,
         MAX(cs.gross_margin_pct) FILTER (WHERE cs.period_rank = 1) AS cur_margin_pct
       FROM greenhouse_core.clients c
       LEFT JOIN client_snapshots cs
         ON cs.client_id = c.client_id
       WHERE c.active = TRUE
       GROUP BY c.client_id
       HAVING COALESCE(MAX(cs.revenue_clp) FILTER (WHERE cs.period_rank = 1), 0) > 0
           OR COALESCE(MAX(cs.total_cost_clp) FILTER (WHERE cs.period_rank = 1), 0) > 0
       ORDER BY cur_revenue DESC, c.client_id ASC`
    )

    return rows.map(r => {
      const rev = roundCurrency(toNumber(r.cur_revenue))
      const prevRev = roundCurrency(toNumber(r.prev_revenue))
      const exp = roundCurrency(toNumber(r.cur_total_cost))
      const trend = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : null
      const marginPct = r.cur_margin_pct == null ? (rev > 0 ? Math.round(((rev - exp) / rev) * 1000) / 10 : null) : Math.round(toNumber(r.cur_margin_pct) * 10) / 10

      return {
        clientId: String(r.client_id),
        revenueCurrentMonth: rev,
        revenuePreviousMonth: prevRev,
        revenueTrend: trend,
        expensesCurrentMonth: exp,
        marginPct,
        periodYear: r.period_year == null ? null : toNumber(r.period_year),
        periodMonth: r.period_month == null ? null : toNumber(r.period_month),
        periodClosed: Boolean(r.period_closed),
        snapshotRevision: r.snapshot_revision == null ? null : toNumber(r.snapshot_revision)
      }
    })
  } catch {
    return []
  }
}
