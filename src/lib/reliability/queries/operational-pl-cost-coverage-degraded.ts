import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  classifyLaborAllocationCoverage,
  type LaborAllocationCoverageStatus
} from '@/lib/commercial-cost-attribution/labor-allocation-readiness'
import type { ReliabilitySignal } from '@/types/reliability'

export const OPERATIONAL_PL_COST_COVERAGE_DEGRADED_SIGNAL_ID =
  'finance.operational_pl.cost_coverage_degraded'

// TASK-1200 — el signal pasa de "error permanente por cualquier período con
// revenue/costo 0" a clasificar la CAUSA con el readiness canónico. El costo 0
// NO siempre es un problema de confiabilidad: puede ser calendario (payroll del
// período aún no corre = `pending`) o historia pre-sistema (`unavailable`). Solo
// `degraded` (payroll existe pero la asignación no se materializó) es un bug que
// merece `error`. El fail-closed de margen vive en `resolveLaborAllocationReadiness`
// (consumido por los consumers de margen); este signal es observabilidad honesta.
const QUERY_SQL = `
  WITH pfloor AS (
    SELECT MIN(year * 100 + month) AS floor_key
    FROM greenhouse_payroll.payroll_periods
  ),
  suspect AS (
    SELECT
      ops.period_year,
      ops.period_month,
      COUNT(*)::int AS snapshot_count,
      COALESCE(SUM(ops.revenue_clp), 0)::numeric AS revenue_clp
    FROM greenhouse_serving.operational_pl_snapshots ops
    WHERE COALESCE(ops.revenue_clp, 0) > 0
      AND COALESCE(ops.total_cost_clp, 0) = 0
    GROUP BY ops.period_year, ops.period_month
  )
  SELECT
    s.period_year,
    s.period_month,
    s.snapshot_count,
    s.revenue_clp,
    (SELECT floor_key FROM pfloor) AS floor_key,
    (
      SELECT COUNT(*)
      FROM greenhouse_payroll.payroll_entries e
      WHERE e.period_id = s.period_year::text || '-' || LPAD(s.period_month::text, 2, '0')
        AND e.is_active
    ) AS payroll_entry_count,
    (
      SELECT COUNT(*)
      FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
      WHERE cla.period_year = s.period_year
        AND cla.period_month = s.period_month
    ) AS labor_allocation_row_count
  FROM suspect s
  ORDER BY s.period_year, s.period_month
`

type SuspectRow = {
  period_year: number | string | null
  period_month: number | string | null
  snapshot_count: number | string | null
  revenue_clp: number | string | null
  floor_key: number | string | null
  payroll_entry_count: number | string | null
  labor_allocation_row_count: number | string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const periodLabel = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export const getOperationalPlCostCoverageDegradedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<SuspectRow>(QUERY_SQL)

    const byStatus: Record<LaborAllocationCoverageStatus, string[]> = {
      canonical: [],
      pending: [],
      unavailable: [],
      degraded: []
    }

    let snapshotCount = 0
    let revenueClp = 0

    for (const row of rows) {
      const year = toNumber(row.period_year)
      const month = toNumber(row.period_month)
      const floorRaw = row.floor_key

      const status = classifyLaborAllocationCoverage({
        periodKey: year * 100 + month,
        payrollSystemFloorKey:
          floorRaw === null || floorRaw === undefined ? null : toNumber(floorRaw),
        payrollEntryCount: toNumber(row.payroll_entry_count),
        laborAllocationRowCount: toNumber(row.labor_allocation_row_count)
      })

      byStatus[status].push(periodLabel(year, month))
      snapshotCount += toNumber(row.snapshot_count)
      revenueClp += toNumber(row.revenue_clp)
    }

    const degradedCount = byStatus.degraded.length
    const pendingCount = byStatus.pending.length
    const unavailableCount = byStatus.unavailable.length
    const totalSuspect = degradedCount + pendingCount + unavailableCount

    // Severity honesta: solo un bug real (`degraded`) alarma. pending/unavailable
    // son ausencia esperada de payroll (calendario / pre-sistema).
    const severity = degradedCount > 0 ? 'error' : 'ok'

    const summary =
      totalSuspect === 0
        ? 'Operational P&L no tiene períodos con revenue y costo 0.'
        : degradedCount > 0
          ? `${degradedCount} período(s) con bug de cobertura laboral (payroll existe, asignación faltante): ${byStatus.degraded.join(', ')}. Revisar el pipeline antes de usar el margen.`
          : `${totalSuspect} período(s) con revenue y costo 0 sin bug: ${pendingCount} pending (payroll por correr: ${byStatus.pending.join(', ') || '—'}), ${unavailableCount} unavailable (pre-sistema: ${byStatus.unavailable.join(', ') || '—'}). Margen no canónico (gated por labor allocation readiness, TASK-1200).`

    return {
      signalId: OPERATIONAL_PL_COST_COVERAGE_DEGRADED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getOperationalPlCostCoverageDegradedSignal',
      label: 'Operational P&L — cobertura de costo laboral',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'degraded_bug_periods', value: byStatus.degraded.join(', ') || '0' },
        { kind: 'metric', label: 'pending_periods', value: byStatus.pending.join(', ') || '0' },
        { kind: 'metric', label: 'unavailable_periods', value: byStatus.unavailable.join(', ') || '0' },
        { kind: 'metric', label: 'snapshot_count', value: String(snapshotCount) },
        { kind: 'metric', label: 'revenue_clp', value: String(Math.round(revenueClp * 100) / 100) },
        {
          kind: 'doc',
          label: 'Readiness',
          value: 'src/lib/commercial-cost-attribution/labor-allocation-readiness.ts (TASK-1200)'
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
      label: 'Operational P&L — cobertura de costo laboral',
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
