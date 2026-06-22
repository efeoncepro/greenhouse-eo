import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const OPERATIONAL_PL_COST_COVERAGE_DEGRADED_SIGNAL_ID =
  'finance.operational_pl.cost_coverage_degraded'

const QUERY_SQL = `
  WITH suspect_periods AS (
    SELECT
      ops.period_year,
      ops.period_month,
      COUNT(*)::int AS snapshot_count,
      COALESCE(SUM(ops.revenue_clp), 0)::numeric AS revenue_clp
    FROM greenhouse_serving.operational_pl_snapshots ops
    WHERE COALESCE(ops.revenue_clp, 0) > 0
      AND COALESCE(ops.total_cost_clp, 0) = 0
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_serving.commercial_cost_attribution cca
        WHERE cca.period_year = ops.period_year
          AND cca.period_month = ops.period_month
      )
      AND NOT EXISTS (
        SELECT 1
        FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
        WHERE cla.period_year = ops.period_year
          AND cla.period_month = ops.period_month
      )
    GROUP BY ops.period_year, ops.period_month
  )
  SELECT
    COUNT(*)::int AS period_count,
    COALESCE(SUM(snapshot_count), 0)::int AS snapshot_count,
    COALESCE(SUM(revenue_clp), 0)::numeric AS revenue_clp,
    COALESCE(
      STRING_AGG(period_year::text || '-' || LPAD(period_month::text, 2, '0'), ', ' ORDER BY period_year, period_month),
      ''
    ) AS periods
  FROM suspect_periods
`

type CostCoverageRow = {
  period_count: number | string | null
  snapshot_count: number | string | null
  revenue_clp: number | string | null
  periods: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const getOperationalPlCostCoverageDegradedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CostCoverageRow>(QUERY_SQL)
    const row = rows[0]
    const periodCount = toNumber(row?.period_count)
    const snapshotCount = toNumber(row?.snapshot_count)
    const revenueClp = toNumber(row?.revenue_clp)
    const periods = row?.periods?.trim() || 'none'

    return {
      signalId: OPERATIONAL_PL_COST_COVERAGE_DEGRADED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getOperationalPlCostCoverageDegradedSignal',
      label: 'Operational P&L con costo upstream faltante',
      severity: periodCount === 0 ? 'ok' : 'error',
      summary:
        periodCount === 0
          ? 'Operational P&L no tiene períodos con revenue y costo cero por falta de cost attribution/labor allocation.'
          : `${periodCount} período${periodCount === 1 ? '' : 's'} (${periods}) publican ${snapshotCount} snapshot${snapshotCount === 1 ? '' : 's'} con revenue y costo 0 sin cost attribution/labor allocation upstream. No usar ese margen como canónico.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'period_count',
          value: String(periodCount)
        },
        {
          kind: 'metric',
          label: 'snapshot_count',
          value: String(snapshotCount)
        },
        {
          kind: 'metric',
          label: 'revenue_clp',
          value: String(Math.round(revenueClp * 100) / 100)
        },
        {
          kind: 'sql',
          label: 'Coverage gate',
          value:
            'operational_pl_snapshots revenue>0 total_cost=0 AND NOT EXISTS commercial_cost_attribution/client_labor_cost_allocation_consolidated for period'
        },
        {
          kind: 'doc',
          label: 'Task',
          value: 'docs/tasks/in-progress/TASK-1190-cost-intelligence-recovery-and-health-gate.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_operational_pl_cost_coverage_degraded' }
    })

    return {
      signalId: OPERATIONAL_PL_COST_COVERAGE_DEGRADED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getOperationalPlCostCoverageDegradedSignal',
      label: 'Operational P&L con costo upstream faltante',
      severity: 'unknown',
      summary: 'No fue posible leer el health gate de Operational P&L. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
