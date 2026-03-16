import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'
import {
  normalizeString,
  normalizeBoolean,
  roundCurrency,
  toNumber,
  toNullableNumber,
  toTimestampString
} from '@/lib/finance/shared'
import {
  assertFinanceSlice2PostgresReady,
  type CostAllocationRecord,
  type ClientEconomicsRecord,
  type AllocationMethod
} from '@/lib/finance/postgres-store-slice2'

// ─── Row types ──────────────────────────────────────────────────────

type CostAllocationRow = {
  allocation_id: string
  expense_id: string
  client_id: string
  client_name: string
  allocation_percent: unknown
  allocated_amount_clp: unknown
  period_year: unknown
  period_month: unknown
  allocation_method: string
  notes: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

type ClientEconomicsRow = {
  snapshot_id: string
  client_id: string
  client_name: string
  period_year: unknown
  period_month: unknown
  total_revenue_clp: unknown
  direct_costs_clp: unknown
  indirect_costs_clp: unknown
  gross_margin_clp: unknown
  gross_margin_percent: unknown
  net_margin_clp: unknown
  net_margin_percent: unknown
  headcount_fte: unknown
  revenue_per_fte: unknown
  cost_per_fte: unknown
  notes: string | null
  computed_at: string | Date | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

// ─── Mappers ────────────────────────────────────────────────────────

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = normalizeString(v)

  return s || null
}

const mapCostAllocation = (row: CostAllocationRow): CostAllocationRecord => ({
  allocationId: normalizeString(row.allocation_id),
  expenseId: normalizeString(row.expense_id),
  clientId: normalizeString(row.client_id),
  clientName: normalizeString(row.client_name),
  allocationPercent: toNumber(row.allocation_percent),
  allocatedAmountClp: toNumber(row.allocated_amount_clp),
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  allocationMethod: normalizeString(row.allocation_method) as AllocationMethod,
  notes: str(row.notes),
  createdBy: str(row.created_by_user_id),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const mapClientEconomics = (row: ClientEconomicsRow): ClientEconomicsRecord => ({
  snapshotId: normalizeString(row.snapshot_id),
  clientId: normalizeString(row.client_id),
  clientName: normalizeString(row.client_name),
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  totalRevenueClp: toNumber(row.total_revenue_clp),
  directCostsClp: toNumber(row.direct_costs_clp),
  indirectCostsClp: toNumber(row.indirect_costs_clp),
  grossMarginClp: toNumber(row.gross_margin_clp),
  grossMarginPercent: toNullableNumber(row.gross_margin_percent),
  netMarginClp: toNumber(row.net_margin_clp),
  netMarginPercent: toNullableNumber(row.net_margin_percent),
  headcountFte: toNullableNumber(row.headcount_fte),
  revenuePerFte: toNullableNumber(row.revenue_per_fte),
  costPerFte: toNullableNumber(row.cost_per_fte),
  notes: str(row.notes),
  computedAt: toTimestampString(row.computed_at as string | { value?: string } | null),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

// ─── Cost Allocations: CRUD ─────────────────────────────────────────

export const createCostAllocation = async ({
  expenseId,
  clientId,
  clientName,
  allocationPercent,
  allocatedAmountClp,
  periodYear,
  periodMonth,
  allocationMethod,
  notes,
  actorUserId
}: {
  expenseId: string
  clientId: string
  clientName: string
  allocationPercent: number
  allocatedAmountClp: number
  periodYear: number
  periodMonth: number
  allocationMethod: string
  notes: string | null
  actorUserId: string | null
}): Promise<CostAllocationRecord> => {
  await assertFinanceSlice2PostgresReady()

  const allocationId = randomUUID()

  const rows = await runGreenhousePostgresQuery<CostAllocationRow>(
    `
      INSERT INTO greenhouse_finance.cost_allocations (
        allocation_id, expense_id, client_id, client_name,
        allocation_percent, allocated_amount_clp,
        period_year, period_month, allocation_method,
        notes, created_by_user_id,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9,
        $10, $11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `,
    [
      allocationId, expenseId, clientId, clientName,
      allocationPercent, roundCurrency(allocatedAmountClp),
      periodYear, periodMonth, allocationMethod,
      notes, actorUserId
    ]
  )

  return mapCostAllocation(rows[0])
}

export const getCostAllocationsByExpense = async (expenseId: string): Promise<CostAllocationRecord[]> => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<CostAllocationRow>(
    `
      SELECT
        allocation_id, expense_id, client_id, client_name,
        allocation_percent, allocated_amount_clp,
        period_year, period_month, allocation_method,
        notes, created_by_user_id, created_at, updated_at
      FROM greenhouse_finance.cost_allocations
      WHERE expense_id = $1
      ORDER BY created_at DESC
    `,
    [expenseId]
  )

  return rows.map(mapCostAllocation)
}

export const getCostAllocationsByClient = async (
  clientId: string,
  year: number,
  month: number
): Promise<CostAllocationRecord[]> => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<CostAllocationRow>(
    `
      SELECT
        allocation_id, expense_id, client_id, client_name,
        allocation_percent, allocated_amount_clp,
        period_year, period_month, allocation_method,
        notes, created_by_user_id, created_at, updated_at
      FROM greenhouse_finance.cost_allocations
      WHERE client_id = $1 AND period_year = $2 AND period_month = $3
      ORDER BY allocated_amount_clp DESC
    `,
    [clientId, year, month]
  )

  return rows.map(mapCostAllocation)
}

export const deleteCostAllocation = async (allocationId: string): Promise<void> => {
  await assertFinanceSlice2PostgresReady()

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_finance.cost_allocations WHERE allocation_id = $1`,
    [allocationId]
  )
}

// ─── Client Economics: CRUD ─────────────────────────────────────────

export const upsertClientEconomicsSnapshot = async ({
  clientId,
  clientName,
  periodYear,
  periodMonth,
  totalRevenueClp,
  directCostsClp,
  indirectCostsClp,
  grossMarginClp,
  grossMarginPercent,
  netMarginClp,
  netMarginPercent,
  headcountFte,
  revenuePerFte,
  costPerFte,
  notes
}: {
  clientId: string
  clientName: string
  periodYear: number
  periodMonth: number
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginClp: number
  grossMarginPercent: number | null
  netMarginClp: number
  netMarginPercent: number | null
  headcountFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
  notes: string | null
}): Promise<ClientEconomicsRecord> => {
  await assertFinanceSlice2PostgresReady()

  const snapshotId = randomUUID()

  const rows = await runGreenhousePostgresQuery<ClientEconomicsRow>(
    `
      INSERT INTO greenhouse_finance.client_economics (
        snapshot_id, client_id, client_name,
        period_year, period_month,
        total_revenue_clp, direct_costs_clp, indirect_costs_clp,
        gross_margin_clp, gross_margin_percent,
        net_margin_clp, net_margin_percent,
        headcount_fte, revenue_per_fte, cost_per_fte,
        notes, computed_at, created_at, updated_at
      )
      VALUES (
        $1, $2, $3,
        $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12,
        $13, $14, $15,
        $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (client_id, period_year, period_month)
      DO UPDATE SET
        client_name = EXCLUDED.client_name,
        total_revenue_clp = EXCLUDED.total_revenue_clp,
        direct_costs_clp = EXCLUDED.direct_costs_clp,
        indirect_costs_clp = EXCLUDED.indirect_costs_clp,
        gross_margin_clp = EXCLUDED.gross_margin_clp,
        gross_margin_percent = EXCLUDED.gross_margin_percent,
        net_margin_clp = EXCLUDED.net_margin_clp,
        net_margin_percent = EXCLUDED.net_margin_percent,
        headcount_fte = EXCLUDED.headcount_fte,
        revenue_per_fte = EXCLUDED.revenue_per_fte,
        cost_per_fte = EXCLUDED.cost_per_fte,
        notes = EXCLUDED.notes,
        computed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      snapshotId, clientId, clientName,
      periodYear, periodMonth,
      roundCurrency(totalRevenueClp), roundCurrency(directCostsClp), roundCurrency(indirectCostsClp),
      roundCurrency(grossMarginClp), grossMarginPercent,
      roundCurrency(netMarginClp), netMarginPercent,
      headcountFte, revenuePerFte != null ? roundCurrency(revenuePerFte) : null, costPerFte != null ? roundCurrency(costPerFte) : null,
      notes
    ]
  )

  return mapClientEconomics(rows[0])
}

export const getClientEconomics = async (
  clientId: string,
  year: number,
  month: number
): Promise<ClientEconomicsRecord | null> => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<ClientEconomicsRow>(
    `
      SELECT
        snapshot_id, client_id, client_name,
        period_year, period_month,
        total_revenue_clp, direct_costs_clp, indirect_costs_clp,
        gross_margin_clp, gross_margin_percent,
        net_margin_clp, net_margin_percent,
        headcount_fte, revenue_per_fte, cost_per_fte,
        notes, computed_at, created_at, updated_at
      FROM greenhouse_finance.client_economics
      WHERE client_id = $1 AND period_year = $2 AND period_month = $3
      LIMIT 1
    `,
    [clientId, year, month]
  )

  return rows.length > 0 ? mapClientEconomics(rows[0]) : null
}

export const listClientEconomicsByPeriod = async (
  year: number,
  month: number
): Promise<ClientEconomicsRecord[]> => {
  await assertFinanceSlice2PostgresReady()

  const rows = await runGreenhousePostgresQuery<ClientEconomicsRow>(
    `
      SELECT
        snapshot_id, client_id, client_name,
        period_year, period_month,
        total_revenue_clp, direct_costs_clp, indirect_costs_clp,
        gross_margin_clp, gross_margin_percent,
        net_margin_clp, net_margin_percent,
        headcount_fte, revenue_per_fte, cost_per_fte,
        notes, computed_at, created_at, updated_at
      FROM greenhouse_finance.client_economics
      WHERE period_year = $1 AND period_month = $2
      ORDER BY total_revenue_clp DESC
    `,
    [year, month]
  )

  return rows.map(mapClientEconomics)
}
