import 'server-only'

/**
 * TASK-462 — MRR / ARR contractual projection materializer.
 *
 * Builds per-period snapshots of active retainer contracts in
 * `greenhouse_serving.contract_mrr_arr_snapshots`. Classifies each
 * contract's movement (new / expansion / contraction / churn /
 * reactivation / unchanged) relative to the previous period so the
 * dashboard can compute MRR deltas, NRR, GRR and churn waterfalls.
 *
 * The materializer is idempotent — upserts by
 * (period_year, period_month, contract_id). Safe to re-run on any
 * reactive event that touches a contract's status or MRR.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { MrrArrMovementType } from './contracts'

interface ContractRow extends Record<string, unknown> {
  contract_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  business_line_code: string | null
  commercial_model: string
  staffing_model: string
  status: string
  start_date: string | Date
  end_date: string | Date | null
  mrr_clp: string | number | null
}

interface PreviousSnapshotRow extends Record<string, unknown> {
  contract_id: string
  mrr_clp: string | number
  movement_type: MrrArrMovementType
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(parsed) ? parsed : 0
}

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  
return String(value).slice(0, 10)
}

const buildPeriodWindow = (year: number, month: number) => {
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  
return { periodStart, periodEnd }
}

const classifyMovement = ({
  currentMrr,
  previousMrr,
  previousMovement
}: {
  currentMrr: number
  previousMrr: number | null
  previousMovement: MrrArrMovementType | null
}): MrrArrMovementType => {
  // No snapshot in previous period, or previous MRR was 0
  if (previousMrr === null || previousMrr === 0) {
    if (currentMrr > 0) {
      // If previous movement was churn, this is a reactivation; otherwise net-new.
      return previousMovement === 'churn' ? 'reactivation' : 'new'
    }

    
return 'unchanged'
  }

  // Previous MRR > 0
  if (currentMrr === 0) return 'churn'
  if (currentMrr > previousMrr) return 'expansion'
  if (currentMrr < previousMrr) return 'contraction'
  
return 'unchanged'
}

export interface BuildMrrArrSnapshotsResult {
  inserted: number
  periodYear: number
  periodMonth: number
}

export const buildMrrArrSnapshotsForPeriod = async (params: {
  year: number
  month: number
}): Promise<BuildMrrArrSnapshotsResult> => {
  const { year, month } = params

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid period ${year}-${month}`)
  }

  const { periodStart, periodEnd } = buildPeriodWindow(year, month)

  // 1. Active retainer contracts overlapping the target month.
  const contracts = await runGreenhousePostgresQuery<ContractRow>(
    `SELECT contract_id, client_id, organization_id, space_id,
            business_line_code, commercial_model, staffing_model, status,
            start_date, end_date, mrr_clp
       FROM greenhouse_commercial.contracts
       WHERE commercial_model = 'retainer'
         AND status = 'active'
         AND start_date < $2
         AND (end_date IS NULL OR end_date >= $1)
         AND mrr_clp IS NOT NULL
         AND mrr_clp > 0`,
    [periodStart, periodEnd]
  )

  // 2. Previous-period snapshot lookup for movement classification.
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const prevSnapshots = await runGreenhousePostgresQuery<PreviousSnapshotRow>(
    `SELECT contract_id, mrr_clp, movement_type
       FROM greenhouse_serving.contract_mrr_arr_snapshots
       WHERE period_year = $1 AND period_month = $2`,
    [prevYear, prevMonth]
  )

  const prevMap = new Map<string, PreviousSnapshotRow>(
    prevSnapshots.map(row => [row.contract_id, row])
  )

  // 3. Churn candidates: had snapshot last period, but not active this period.
  const currentIds = new Set(contracts.map(c => c.contract_id))

  const churnCandidateIds = prevSnapshots
    .filter(s => !currentIds.has(s.contract_id) && toNumber(s.mrr_clp) > 0)
    .map(s => s.contract_id)

  const churnContracts = churnCandidateIds.length > 0
    ? await runGreenhousePostgresQuery<ContractRow>(
        `SELECT contract_id, client_id, organization_id, space_id,
                business_line_code, commercial_model, staffing_model, status,
                start_date, end_date, 0 AS mrr_clp
           FROM greenhouse_commercial.contracts
           WHERE contract_id = ANY($1::text[])`,
        [churnCandidateIds]
      )
    : []

  interface RowToUpsert {
    row: ContractRow
    previous: PreviousSnapshotRow | null
    currentMrr: number
  }

  const rowsToUpsert: RowToUpsert[] = contracts.map(contract => ({
    row: contract,
    previous: prevMap.get(contract.contract_id) ?? null,
    currentMrr: toNumber(contract.mrr_clp)
  }))

  for (const churnContract of churnContracts) {
    const previous = prevMap.get(churnContract.contract_id)

    if (previous) {
      rowsToUpsert.push({ row: churnContract, previous, currentMrr: 0 })
    }
  }

  let inserted = 0

  for (const { row, previous, currentMrr } of rowsToUpsert) {
    const previousMrr = previous ? toNumber(previous.mrr_clp) : null
    const previousMovement = previous?.movement_type ?? null

    const movementType = classifyMovement({
      currentMrr,
      previousMrr,
      previousMovement
    })

    // Suppress rows where we would write an unchanged zero-MRR placeholder
    // for a contract that was never recorded — avoids polluting the table
    // when a churn candidate no longer exists.
    if (currentMrr === 0 && previousMrr === null) continue

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.contract_mrr_arr_snapshots (
         period_year, period_month, contract_id,
         client_id, organization_id, space_id,
         business_line_code, commercial_model, staffing_model,
         mrr_clp, previous_mrr_clp, movement_type, materialized_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (period_year, period_month, contract_id) DO UPDATE SET
         client_id = EXCLUDED.client_id,
         organization_id = EXCLUDED.organization_id,
         space_id = EXCLUDED.space_id,
         business_line_code = EXCLUDED.business_line_code,
         commercial_model = EXCLUDED.commercial_model,
         staffing_model = EXCLUDED.staffing_model,
         mrr_clp = EXCLUDED.mrr_clp,
         previous_mrr_clp = EXCLUDED.previous_mrr_clp,
         movement_type = EXCLUDED.movement_type,
         materialized_at = NOW()`,
      [
        year,
        month,
        row.contract_id,
        row.client_id,
        row.organization_id,
        row.space_id,
        row.business_line_code,
        row.commercial_model,
        row.staffing_model,
        currentMrr,
        previousMrr,
        movementType
      ]
    )

    inserted++
  }

  return { inserted, periodYear: year, periodMonth: month }
}

export interface BackfillMrrArrResult {
  periodsProcessed: number
  totalRows: number
}

/**
 * Walks every month from the earliest contract start date up to the
 * current UTC month and materializes snapshots for each period in
 * chronological order. Used for first-load backfill and disaster
 * recovery — not wired into reactive refresh.
 */
export const backfillMrrArrFromFirstContract = async (): Promise<BackfillMrrArrResult> => {
  const earliestRows = await runGreenhousePostgresQuery<{ earliest: string | null } & Record<string, unknown>>(
    `SELECT MIN(start_date)::text AS earliest
       FROM greenhouse_commercial.contracts
       WHERE commercial_model = 'retainer'`,
    []
  )

  const earliestIso = toIsoDate(earliestRows[0]?.earliest ?? null)

  if (!earliestIso) return { periodsProcessed: 0, totalRows: 0 }

  const start = new Date(`${earliestIso}T00:00:00Z`)
  const today = new Date()

  if (Number.isNaN(start.getTime())) {
    return { periodsProcessed: 0, totalRows: 0 }
  }

  let totalRows = 0
  let periodsProcessed = 0

  for (let y = start.getUTCFullYear(); y <= today.getUTCFullYear(); y++) {
    const monthFrom = y === start.getUTCFullYear() ? start.getUTCMonth() + 1 : 1
    const monthTo = y === today.getUTCFullYear() ? today.getUTCMonth() + 1 : 12

    for (let m = monthFrom; m <= monthTo; m++) {
      const result = await buildMrrArrSnapshotsForPeriod({ year: y, month: m })

      totalRows += result.inserted
      periodsProcessed++
    }
  }

  return { periodsProcessed, totalRows }
}

export const __testing = {
  classifyMovement,
  buildPeriodWindow
}
