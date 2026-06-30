import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

// ─── Labor Allocation Readiness (TASK-1200) ─────────────────────────────────
//
// Preflight de cobertura laboral por período. Decide honestamente si el margen
// del Operational P&L de un período es canónico, y si no, POR QUÉ no — para que
// ningún consumer (Finance close, P&L API, Nexa, pricing) trate un período con
// costo 0 como margen real.
//
// Root cause (TASK-1200): los períodos con revenue>0 y costo 0 NO son un bug del
// pipeline de cost attribution. Cuando hay payroll upstream, el pipeline produce
// costo correctamente (Feb–May 2026). El costo 0 = AUSENCIA de payroll upstream:
//   - `unavailable`: período anterior al inicio del sistema de payroll (pre-system,
//     p.ej. Nov/Dic 2025, Ene 2026) — nunca habrá fuente de costo laboral.
//   - `pending`: período en/después del floor pero cuyo payroll aún no se ejecutó
//     ni se materializó la asignación (p.ej. Jun 2026 hasta que corra el payroll).
//   - `degraded`: payroll del período EXISTE pero la asignación laboral no se
//     materializó → bug real del pipeline (hoy: 0 casos).
//   - `canonical`: asignación laboral presente → margen confiable.
//
// SoT: docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md
//      docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md

export type LaborAllocationCoverageStatus = 'canonical' | 'pending' | 'unavailable' | 'degraded'

export interface LaborAllocationReadiness {
  periodYear: number
  periodMonth: number
  status: LaborAllocationCoverageStatus
  /** `null` si no existe fila en `payroll_periods` para el período. */
  payrollPeriodStatus: string | null
  payrollEntryCount: number
  laborAllocationRowCount: number
  revenueClp: number
  totalCostClp: number
  /** Período más antiguo con payroll en el sistema (`year*100+month`), o `null` si no hay payroll. */
  payrollSystemFloorKey: number | null
  reason: string
}

const periodKeyOf = (year: number, month: number) => year * 100 + month

const buildReason = (status: LaborAllocationCoverageStatus, floorKey: number | null): string => {
  switch (status) {
    case 'canonical':
      return 'Cobertura laboral materializada para el período; el margen es canónico.'
    case 'degraded':
      return 'El payroll del período existe pero la asignación laboral no se materializó. Revisar el pipeline de cost attribution antes de usar el margen.'

    case 'unavailable': {
      const floorLabel =
        floorKey === null
          ? 'sin payroll en el sistema'
          : `${Math.floor(floorKey / 100)}-${String(floorKey % 100).padStart(2, '0')}`

      
return `Período anterior al inicio del sistema de payroll (primer período: ${floorLabel}). No hay fuente de costo laboral; el margen no será canónico para este mes.`
    }

    case 'pending':
    default:
      return 'El payroll del período aún no se ejecutó/cerró. El margen no es canónico hasta que corra el payroll y se materialice la asignación laboral.'
  }
}

/**
 * Clasificador puro (single source of truth). Reusado por el reader per-período y
 * por el reliability signal de cobertura. No toca PG.
 */
export const classifyLaborAllocationCoverage = (input: {
  periodKey: number
  payrollSystemFloorKey: number | null
  payrollEntryCount: number
  laborAllocationRowCount: number
}): LaborAllocationCoverageStatus => {
  const { periodKey, payrollSystemFloorKey, payrollEntryCount, laborAllocationRowCount } = input

  if (laborAllocationRowCount > 0) return 'canonical'
  if (payrollEntryCount > 0) return 'degraded'
  if (payrollSystemFloorKey !== null && periodKey < payrollSystemFloorKey) return 'unavailable'

  return 'pending'
}

/** Fail-closed: el margen es canónico SOLO cuando la cobertura es `canonical`. */
export const isLaborAllocationCoverageCanonical = (readiness: LaborAllocationReadiness): boolean =>
  readiness.status === 'canonical'

interface ReadinessRow extends Record<string, unknown> {
  floor_key: number | string | null
  payroll_period_status: string | null
  payroll_entry_count: number | string | null
  labor_allocation_row_count: number | string | null
  revenue_clp: number | string | null
  total_cost_clp: number | string | null
}

const toNum = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const READINESS_SQL = `
  WITH pfloor AS (
    SELECT MIN(year * 100 + month) AS floor_key
    FROM greenhouse_payroll.payroll_periods
  ),
  pp AS (
    SELECT status
    FROM greenhouse_payroll.payroll_periods
    WHERE year = $1 AND month = $2
    LIMIT 1
  ),
  pe AS (
    SELECT COUNT(*) AS cnt
    FROM greenhouse_payroll.payroll_entries
    WHERE period_id = $3 AND is_active
  ),
  la AS (
    SELECT COUNT(*) AS cnt
    FROM greenhouse_serving.client_labor_cost_allocation_consolidated
    WHERE period_year = $1 AND period_month = $2
  ),
  pl AS (
    SELECT
      COALESCE(SUM(revenue_clp), 0) AS revenue_clp,
      COALESCE(SUM(total_cost_clp), 0) AS total_cost_clp
    FROM greenhouse_serving.operational_pl_snapshots
    WHERE period_year = $1 AND period_month = $2 AND scope_type = 'client'
  )
  SELECT
    (SELECT floor_key FROM pfloor) AS floor_key,
    (SELECT status FROM pp) AS payroll_period_status,
    (SELECT cnt FROM pe) AS payroll_entry_count,
    (SELECT cnt FROM la) AS labor_allocation_row_count,
    (SELECT revenue_clp FROM pl) AS revenue_clp,
    (SELECT total_cost_clp FROM pl) AS total_cost_clp
`

/**
 * Readiness de cobertura laboral para un período. Server-side, re-run safe,
 * read-only. Consumido por el P&L API, Finance close y el reliability signal.
 */
export const resolveLaborAllocationReadiness = async (
  periodYear: number,
  periodMonth: number
): Promise<LaborAllocationReadiness> => {
  const periodId = `${periodYear}-${String(periodMonth).padStart(2, '0')}`

  try {
    const rows = await query<ReadinessRow>(READINESS_SQL, [periodYear, periodMonth, periodId])
    const row = rows[0]

    const floorRaw = row?.floor_key ?? null

    const payrollSystemFloorKey =
      floorRaw === null || floorRaw === undefined ? null : toNum(floorRaw)

    const payrollEntryCount = toNum(row?.payroll_entry_count ?? null)
    const laborAllocationRowCount = toNum(row?.labor_allocation_row_count ?? null)

    const status = classifyLaborAllocationCoverage({
      periodKey: periodKeyOf(periodYear, periodMonth),
      payrollSystemFloorKey,
      payrollEntryCount,
      laborAllocationRowCount
    })

    return {
      periodYear,
      periodMonth,
      status,
      payrollPeriodStatus: row?.payroll_period_status ?? null,
      payrollEntryCount,
      laborAllocationRowCount,
      revenueClp: toNum(row?.revenue_clp ?? null),
      totalCostClp: toNum(row?.total_cost_clp ?? null),
      payrollSystemFloorKey,
      reason: buildReason(status, payrollSystemFloorKey)
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'labor_allocation_readiness', stage: 'pg_read' }
    })

    // Degradación honesta: ante error de lectura, NO afirmar canónico. `pending`
    // mantiene el margen fuera de uso canónico.
    return {
      periodYear,
      periodMonth,
      status: 'pending',
      payrollPeriodStatus: null,
      payrollEntryCount: 0,
      laborAllocationRowCount: 0,
      revenueClp: 0,
      totalCostClp: 0,
      payrollSystemFloorKey: null,
      reason: 'No se pudo resolver la cobertura laboral del período (degradación honesta; margen no canónico).'
    }
  }
}
