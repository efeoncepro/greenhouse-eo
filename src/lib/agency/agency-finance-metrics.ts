import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export interface SpaceFinanceMetrics {
  clientId: string
  organizationId: string | null
  spaceId: string | null
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
      organization_id: string | number | null
      space_id: string | number | null
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
           s.client_id,
           s.organization_id,
           s.space_id,
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
         INNER JOIN greenhouse_core.spaces s
           ON s.space_id = ops.scope_id
          AND s.active = TRUE
         WHERE ops.scope_type = 'space'
       ),
       space_snapshots AS (
         SELECT
           rr.client_id,
           rr.organization_id,
           rr.space_id,
           rr.period_year,
           rr.period_month,
           rr.period_closed,
           rr.snapshot_revision,
           rr.revenue_clp,
           rr.total_cost_clp,
           rr.gross_margin_pct,
           ROW_NUMBER() OVER (
             PARTITION BY rr.space_id
             ORDER BY rr.period_year DESC, rr.period_month DESC
           ) AS period_rank
         FROM ranked_revisions rr
         WHERE rr.revision_rank = 1
       )
       SELECT
         s.client_id,
         s.organization_id,
         s.space_id,
         MAX(ss.period_year) FILTER (WHERE ss.period_rank = 1) AS period_year,
         MAX(ss.period_month) FILTER (WHERE ss.period_rank = 1) AS period_month,
         COALESCE(BOOL_OR(ss.period_closed) FILTER (WHERE ss.period_rank = 1), FALSE) AS period_closed,
         MAX(ss.snapshot_revision) FILTER (WHERE ss.period_rank = 1) AS snapshot_revision,
         COALESCE(MAX(ss.revenue_clp) FILTER (WHERE ss.period_rank = 1), 0) AS cur_revenue,
         COALESCE(MAX(ss.revenue_clp) FILTER (WHERE ss.period_rank = 2), 0) AS prev_revenue,
         COALESCE(MAX(ss.total_cost_clp) FILTER (WHERE ss.period_rank = 1), 0) AS cur_total_cost,
         MAX(ss.gross_margin_pct) FILTER (WHERE ss.period_rank = 1) AS cur_margin_pct
       FROM greenhouse_core.spaces s
       LEFT JOIN space_snapshots ss
         ON ss.space_id = s.space_id
       WHERE s.active = TRUE
         AND s.client_id IS NOT NULL
       GROUP BY s.client_id, s.organization_id, s.space_id
       HAVING COALESCE(MAX(ss.revenue_clp) FILTER (WHERE ss.period_rank = 1), 0) > 0
           OR COALESCE(MAX(ss.total_cost_clp) FILTER (WHERE ss.period_rank = 1), 0) > 0
       ORDER BY cur_revenue DESC, s.space_id ASC`
    )

    return rows.map(r => {
      const rev = roundCurrency(toNumber(r.cur_revenue))
      const prevRev = roundCurrency(toNumber(r.prev_revenue))
      const exp = roundCurrency(toNumber(r.cur_total_cost))
      const trend = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : null
      const marginPct = r.cur_margin_pct == null ? (rev > 0 ? Math.round(((rev - exp) / rev) * 1000) / 10 : null) : Math.round(toNumber(r.cur_margin_pct) * 10) / 10

      return {
        clientId: String(r.client_id),
        organizationId: r.organization_id == null ? null : String(r.organization_id),
        spaceId: r.space_id == null ? null : String(r.space_id),
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
