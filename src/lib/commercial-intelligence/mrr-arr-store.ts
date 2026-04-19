import 'server-only'

/**
 * TASK-462 — Read-side store for contract MRR/ARR snapshots.
 *
 * Serves the MRR/ARR dashboard: per-period listing, totals with
 * breakdowns, 12-month series, NRR/GRR computation, and movement
 * drill-down lists. All queries are tenant-scoped via optional
 * `spaceId` filter and enforce movement-type safety.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  MRR_ARR_MOVEMENT_TYPES,
  type ContractMrrArrSnapshotRow,
  type MrrArrMovementEntry,
  type MrrArrMovementType,
  type MrrArrNrrComputation,
  type MrrArrPeriodTotals,
  type MrrArrSeriesPoint
} from './contracts'

export interface MrrArrFilters {
  spaceId?: string | null
  clientId?: string | null
  businessLineCode?: string | null
  commercialModel?: string | null
  staffingModel?: string | null
}

interface SnapshotDbRow extends Record<string, unknown> {
  period_year: number
  period_month: number
  contract_id: string
  contract_number: string | null
  client_id: string | null
  client_name: string | null
  organization_id: string | null
  space_id: string | null
  business_line_code: string | null
  commercial_model: string
  staffing_model: string
  mrr_clp: string | number
  arr_clp: string | number
  previous_mrr_clp: string | number | null
  mrr_delta_clp: string | number
  movement_type: MrrArrMovementType
  materialized_at: string | Date
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(parsed) ? parsed : null
}

const toIsoString = (value: string | Date | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  
return String(value)
}

const normalizeSnapshot = (row: SnapshotDbRow): ContractMrrArrSnapshotRow => ({
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  contractId: row.contract_id,
  contractNumber: row.contract_number ?? null,
  clientId: row.client_id ?? null,
  clientName: row.client_name ?? null,
  organizationId: row.organization_id ?? null,
  spaceId: row.space_id ?? null,
  businessLineCode: row.business_line_code ?? null,
  commercialModel: row.commercial_model,
  staffingModel: row.staffing_model,
  mrrClp: toNumber(row.mrr_clp),
  arrClp: toNumber(row.arr_clp),
  previousMrrClp: toNullableNumber(row.previous_mrr_clp),
  mrrDeltaClp: toNumber(row.mrr_delta_clp),
  movementType: row.movement_type,
  materializedAt: toIsoString(row.materialized_at)
})

const applyFilters = (
  filters: MrrArrFilters | undefined,
  params: unknown[]
): string => {
  if (!filters) return ''

  const clauses: string[] = []

  if (filters.spaceId !== undefined && filters.spaceId !== null) {
    params.push(filters.spaceId)
    clauses.push(`s.space_id = $${params.length}`)
  }

  if (filters.clientId) {
    params.push(filters.clientId)
    clauses.push(`s.client_id = $${params.length}`)
  }

  if (filters.businessLineCode) {
    params.push(filters.businessLineCode)
    clauses.push(`s.business_line_code = $${params.length}`)
  }

  if (filters.commercialModel) {
    params.push(filters.commercialModel)
    clauses.push(`s.commercial_model = $${params.length}`)
  }

  if (filters.staffingModel) {
    params.push(filters.staffingModel)
    clauses.push(`s.staffing_model = $${params.length}`)
  }

  return clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : ''
}

const SELECT_SNAPSHOT_SQL = `
  SELECT
    s.period_year, s.period_month, s.contract_id,
    c.contract_number,
    s.client_id,
    cl.client_name,
    s.organization_id, s.space_id,
    s.business_line_code, s.commercial_model, s.staffing_model,
    s.mrr_clp, s.arr_clp, s.previous_mrr_clp, s.mrr_delta_clp,
    s.movement_type, s.materialized_at
  FROM greenhouse_serving.contract_mrr_arr_snapshots AS s
  LEFT JOIN greenhouse_commercial.contracts AS c ON c.contract_id = s.contract_id
  LEFT JOIN greenhouse_core.clients AS cl ON cl.client_id = s.client_id
`

export const listMrrArrByPeriod = async (params: {
  year: number
  month: number
  filters?: MrrArrFilters
}): Promise<ContractMrrArrSnapshotRow[]> => {
  const { year, month, filters } = params
  const queryParams: unknown[] = [year, month]
  const filterSql = applyFilters(filters, queryParams)

  const rows = await runGreenhousePostgresQuery<SnapshotDbRow>(
    `${SELECT_SNAPSHOT_SQL}
     WHERE s.period_year = $1
       AND s.period_month = $2
       ${filterSql}
     ORDER BY s.mrr_clp DESC, s.contract_id ASC`,
    queryParams
  )

  return rows.map(normalizeSnapshot)
}

const emptyMovementAgg = (): Record<MrrArrMovementType, { mrrClp: number; count: number }> => ({
  new: { mrrClp: 0, count: 0 },
  expansion: { mrrClp: 0, count: 0 },
  contraction: { mrrClp: 0, count: 0 },
  churn: { mrrClp: 0, count: 0 },
  reactivation: { mrrClp: 0, count: 0 },
  unchanged: { mrrClp: 0, count: 0 }
})

export const getMrrArrPeriodTotals = async (params: {
  year: number
  month: number
  filters?: MrrArrFilters
}): Promise<MrrArrPeriodTotals> => {
  const { year, month, filters } = params

  const snapshots = await listMrrArrByPeriod({ year, month, filters })

  const activeSnapshots = snapshots.filter(s => s.mrrClp > 0)

  const mrrClp = activeSnapshots.reduce((sum, s) => sum + s.mrrClp, 0)
  const arrClp = mrrClp * 12
  const contractsCount = activeSnapshots.length

  const byCommercialModel: Record<string, { mrrClp: number; count: number }> = {}
  const byStaffingModel: Record<string, { mrrClp: number; count: number }> = {}
  const byBusinessLine: Record<string, { mrrClp: number; count: number }> = {}
  const byMovement = emptyMovementAgg()

  for (const s of activeSnapshots) {
    const cm = s.commercialModel || 'unknown'
    const sm = s.staffingModel || 'unknown'
    const bl = s.businessLineCode || 'unknown'

    byCommercialModel[cm] = byCommercialModel[cm]
      ? { mrrClp: byCommercialModel[cm].mrrClp + s.mrrClp, count: byCommercialModel[cm].count + 1 }
      : { mrrClp: s.mrrClp, count: 1 }

    byStaffingModel[sm] = byStaffingModel[sm]
      ? { mrrClp: byStaffingModel[sm].mrrClp + s.mrrClp, count: byStaffingModel[sm].count + 1 }
      : { mrrClp: s.mrrClp, count: 1 }

    byBusinessLine[bl] = byBusinessLine[bl]
      ? { mrrClp: byBusinessLine[bl].mrrClp + s.mrrClp, count: byBusinessLine[bl].count + 1 }
      : { mrrClp: s.mrrClp, count: 1 }
  }

  // Movement aggregations use ALL snapshots (including churn at 0).
  for (const s of snapshots) {
    const bucket = byMovement[s.movementType]

    bucket.mrrClp += s.mrrClp
    bucket.count += 1
  }

  // Compute previous-period MRR (filtered, active only) for delta.
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const prevSnapshots = await listMrrArrByPeriod({
    year: prevYear,
    month: prevMonth,
    filters
  })

  const prevMrr = prevSnapshots.filter(s => s.mrrClp > 0).reduce((sum, s) => sum + s.mrrClp, 0)

  const mrrDeltaFromPrevClp = mrrClp - prevMrr
  const mrrDeltaPctFromPrev = prevMrr > 0 ? (mrrDeltaFromPrevClp / prevMrr) * 100 : null

  return {
    periodYear: year,
    periodMonth: month,
    mrrClp,
    arrClp,
    contractsCount,
    mrrDeltaFromPrevClp,
    mrrDeltaPctFromPrev,
    byCommercialModel,
    byStaffingModel,
    byBusinessLine,
    byMovement
  }
}

interface SeriesAggregateRow extends Record<string, unknown> {
  period_year: number
  period_month: number
  mrr_clp: string | number | null
  contracts_count: string | number | null
  movement_type: MrrArrMovementType
  movement_mrr_clp: string | number | null
  movement_count: string | number | null
}

export const getMrrArrSeries = async (params: {
  months: number
  filters?: MrrArrFilters
}): Promise<MrrArrSeriesPoint[]> => {
  const { months, filters } = params

  const lookback = Math.max(1, Math.min(60, Math.trunc(months)))

  const queryParams: unknown[] = [lookback]
  const filterSql = applyFilters(filters, queryParams)

  const rows = await runGreenhousePostgresQuery<SeriesAggregateRow>(
    `WITH bounds AS (
       SELECT DATE_TRUNC('month', NOW())::date AS end_month,
              (DATE_TRUNC('month', NOW()) - make_interval(months => ($1::int - 1)))::date AS start_month
     ),
     filtered AS (
       SELECT s.period_year, s.period_month, s.mrr_clp, s.movement_type, s.contract_id
         FROM greenhouse_serving.contract_mrr_arr_snapshots AS s
        WHERE make_date(s.period_year, s.period_month, 1) >= (SELECT start_month FROM bounds)
          AND make_date(s.period_year, s.period_month, 1) <= (SELECT end_month FROM bounds)
          ${filterSql}
     )
     SELECT
       f.period_year,
       f.period_month,
       SUM(CASE WHEN f.mrr_clp > 0 THEN f.mrr_clp ELSE 0 END) AS mrr_clp,
       SUM(CASE WHEN f.mrr_clp > 0 THEN 1 ELSE 0 END) AS contracts_count,
       f.movement_type,
       SUM(f.mrr_clp) AS movement_mrr_clp,
       COUNT(*) AS movement_count
     FROM filtered AS f
     GROUP BY f.period_year, f.period_month, f.movement_type
     ORDER BY f.period_year ASC, f.period_month ASC`,
    queryParams
  )

  const byPeriod = new Map<string, MrrArrSeriesPoint>()

  for (const row of rows) {
    const key = `${row.period_year}-${row.period_month}`
    let point = byPeriod.get(key)

    if (!point) {
      point = {
        periodYear: Number(row.period_year),
        periodMonth: Number(row.period_month),
        mrrClp: toNumber(row.mrr_clp),
        arrClp: toNumber(row.mrr_clp) * 12,
        contractsCount: toNumber(row.contracts_count),
        movements: emptyMovementAgg()
      }
      byPeriod.set(key, point)
    } else {
      // mrr_clp and contracts_count are aggregates over all movement types for the same
      // period — use the max (all CASE-filtered totals are equal by construction, so
      // overriding is safe but a max keeps the code defensive if rows were absent).
      point.mrrClp = Math.max(point.mrrClp, toNumber(row.mrr_clp))
      point.arrClp = point.mrrClp * 12
      point.contractsCount = Math.max(point.contractsCount, toNumber(row.contracts_count))
    }

    point.movements[row.movement_type] = {
      mrrClp: toNumber(row.movement_mrr_clp),
      count: toNumber(row.movement_count)
    }
  }

  return Array.from(byPeriod.values()).sort((a, b) => {
    if (a.periodYear !== b.periodYear) return a.periodYear - b.periodYear
    
return a.periodMonth - b.periodMonth
  })
}

export const computeNrr = async (params: {
  endYear: number
  endMonth: number
  filters?: MrrArrFilters
}): Promise<MrrArrNrrComputation> => {
  const { endYear, endMonth, filters } = params

  // Starting MRR = MRR 12 months prior.
  const startMonthIndex = (endYear * 12 + (endMonth - 1)) - 12
  const startYear = Math.floor(startMonthIndex / 12)
  const startMonth = (startMonthIndex % 12) + 1

  const startSnapshots = await listMrrArrByPeriod({
    year: startYear,
    month: startMonth,
    filters
  })

  const endSnapshots = await listMrrArrByPeriod({
    year: endYear,
    month: endMonth,
    filters
  })

  const startingMrrClp = startSnapshots
    .filter(s => s.mrrClp > 0)
    .reduce((sum, s) => sum + s.mrrClp, 0)

  const endingMrrClp = endSnapshots
    .filter(s => s.mrrClp > 0)
    .reduce((sum, s) => sum + s.mrrClp, 0)

  // Aggregate movements across the 12-month window for each movement type.
  const queryParams: unknown[] = [startYear, startMonth, endYear, endMonth]
  const filterSql = applyFilters(filters, queryParams)

  const windowRows = await runGreenhousePostgresQuery<{
    movement_type: MrrArrMovementType
    total_mrr_delta_clp: string | number | null
    total_mrr_clp: string | number | null
  } & Record<string, unknown>>(
    `SELECT s.movement_type,
            SUM(s.mrr_delta_clp) AS total_mrr_delta_clp,
            SUM(s.mrr_clp) AS total_mrr_clp
       FROM greenhouse_serving.contract_mrr_arr_snapshots AS s
      WHERE (s.period_year * 100 + s.period_month) > ($1::int * 100 + $2::int)
        AND (s.period_year * 100 + s.period_month) <= ($3::int * 100 + $4::int)
        ${filterSql}
      GROUP BY s.movement_type`,
    queryParams
  )

  let expansionClp = 0
  let reactivationClp = 0
  let contractionClp = 0
  let churnClp = 0

  for (const row of windowRows) {
    const delta = toNumber(row.total_mrr_delta_clp)
    const mrr = toNumber(row.total_mrr_clp)

    if (row.movement_type === 'expansion') expansionClp += delta
    else if (row.movement_type === 'reactivation') reactivationClp += mrr
    else if (row.movement_type === 'contraction') contractionClp += Math.abs(delta)
    else if (row.movement_type === 'churn') {
      // For churn, current MRR = 0 and previous MRR = absolute lost revenue.
      // mrr_delta_clp = 0 - previous_mrr_clp => negative. We want the magnitude.
      churnClp += Math.abs(delta)
    }
  }

  const nrrPct = startingMrrClp > 0
    ? ((startingMrrClp + expansionClp + reactivationClp - contractionClp - churnClp) / startingMrrClp) * 100
    : null

  const grrPct = startingMrrClp > 0
    ? ((startingMrrClp - contractionClp - churnClp) / startingMrrClp) * 100
    : null

  return {
    startingMrrClp,
    endingMrrClp,
    expansionClp,
    reactivationClp,
    contractionClp,
    churnClp,
    nrrPct,
    grrPct
  }
}

export const listMrrArrMovements = async (params: {
  year: number
  month: number
  filters?: MrrArrFilters
  movementType?: MrrArrMovementType
}): Promise<MrrArrMovementEntry[]> => {
  const { year, month, filters, movementType } = params

  const queryParams: unknown[] = [year, month]
  const filterSql = applyFilters(filters, queryParams)

  let movementSql = ''

  if (movementType) {
    if (!MRR_ARR_MOVEMENT_TYPES.includes(movementType)) {
      throw new Error(`Invalid movementType: ${movementType}`)
    }

    queryParams.push(movementType)
    movementSql = ` AND s.movement_type = $${queryParams.length}`
  } else {
    movementSql = ` AND s.movement_type != 'unchanged'`
  }

  const rows = await runGreenhousePostgresQuery<SnapshotDbRow>(
    `${SELECT_SNAPSHOT_SQL}
     WHERE s.period_year = $1
       AND s.period_month = $2
       ${filterSql}
       ${movementSql}
     ORDER BY ABS(s.mrr_delta_clp) DESC, s.contract_id ASC`,
    queryParams
  )

  return rows.map(row => {
    const snap = normalizeSnapshot(row)

    
return {
      contractId: snap.contractId,
      contractNumber: snap.contractNumber,
      clientId: snap.clientId,
      clientName: snap.clientName,
      businessLineCode: snap.businessLineCode,
      commercialModel: snap.commercialModel,
      staffingModel: snap.staffingModel,
      mrrClp: snap.mrrClp,
      previousMrrClp: snap.previousMrrClp,
      mrrDeltaClp: snap.mrrDeltaClp,
      movementType: snap.movementType
    }
  })
}
