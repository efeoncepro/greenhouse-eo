import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  normalizeString,
  roundCurrency,
  toNumber,
  toNullableNumber,
  toTimestampString
} from '@/lib/finance/shared'
import { getMonthDateRange } from '@/lib/finance/periods'
import {
  assertFinanceSlice2PostgresReady,
  type CostAllocationRecord,
  type ClientEconomicsRecord,
  type AllocationMethod
} from '@/lib/finance/postgres-store-slice2'
import { computeClientLaborCosts } from '@/lib/finance/payroll-cost-allocation'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

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
  acquisitionCostClp: null,
  ltvToCacRatio: null,
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

  return withGreenhousePostgresTransaction(async client => {
    const result = await client.query<CostAllocationRow>(
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

    const created = mapCostAllocation(result.rows[0])

    await publishOutboxEvent({
      aggregateType: 'cost_allocation',
      aggregateId: allocationId,
      eventType: 'finance.cost_allocation.created',
      payload: {
        allocationId,
        expenseId,
        clientId,
        clientName,
        periodYear,
        periodMonth,
        allocationMethod,
        allocatedAmountClp: created.allocatedAmountClp
      }
    }, client)

    return created
  })
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

  await withGreenhousePostgresTransaction(async client => {
    const result = await client.query<CostAllocationRow>(
      `
        DELETE FROM greenhouse_finance.cost_allocations
        WHERE allocation_id = $1
        RETURNING *
      `,
      [allocationId]
    )

    const deleted = result.rows[0]

    if (!deleted) return

    await publishOutboxEvent({
      aggregateType: 'cost_allocation',
      aggregateId: allocationId,
      eventType: 'finance.cost_allocation.deleted',
      payload: {
        allocationId: deleted.allocation_id,
        expenseId: deleted.expense_id,
        clientId: deleted.client_id,
        clientName: deleted.client_name,
        periodYear: toNumber(deleted.period_year),
        periodMonth: toNumber(deleted.period_month),
        allocationMethod: deleted.allocation_method,
        allocatedAmountClp: toNumber(deleted.allocated_amount_clp)
      }
    }, client)
  })
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

export const computeClientEconomicsSnapshots = async (
  year: number,
  month: number,
  notes: string | null = null
): Promise<ClientEconomicsRecord[]> => {
  await assertFinanceSlice2PostgresReady()

  const { periodStart, periodEnd } = getMonthDateRange(year, month)

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

  let laborCosts: Awaited<ReturnType<typeof computeClientLaborCosts>> = []

  try {
    laborCosts = await computeClientLaborCosts(year, month)
  } catch {
    laborCosts = []
  }

  const fteMap = new Map<string, { fte: number; laborClp: number }>(
    laborCosts.map(lc => [lc.clientId, { fte: lc.headcountFte, laborClp: lc.allocatedLaborClp }])
  )

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

  for (const lc of laborCosts) {
    const existing = clientMap.get(lc.clientId) || {
      clientName: lc.clientName,
      revenue: 0,
      directCosts: 0,
      indirectCosts: 0
    }

    existing.directCosts += lc.allocatedLaborClp
    clientMap.set(lc.clientId, existing)
  }

  // LTV/CAC: fetch acquisition costs per client (all-time)
  const cacRows = await runGreenhousePostgresQuery<{
    allocated_client_id: string
    acquisition_cost_clp: string
  }>(
    `SELECT
       allocated_client_id,
       COALESCE(SUM(total_amount_clp), 0) AS acquisition_cost_clp
     FROM greenhouse_finance.expenses
     WHERE cost_category = 'client_acquisition'
       AND allocated_client_id IS NOT NULL
     GROUP BY allocated_client_id`
  )

  const cacMap = new Map<string, number>(
    cacRows.map(r => [r.allocated_client_id, toNumber(r.acquisition_cost_clp)])
  )

  // LTV: lifetime gross margin per client (all-time)
  const ltvRows = await runGreenhousePostgresQuery<{
    client_id: string
    lifetime_margin_clp: string
  }>(
    `SELECT
       client_id,
       COALESCE(SUM(gross_margin_clp), 0) AS lifetime_margin_clp
     FROM greenhouse_finance.client_economics
     GROUP BY client_id`
  )

  const ltvMap = new Map<string, number>(
    ltvRows.map(r => [r.client_id, toNumber(r.lifetime_margin_clp)])
  )

  const results: ClientEconomicsRecord[] = []

  for (const [clientId, data] of clientMap.entries()) {
    const totalCosts = roundCurrency(data.directCosts + data.indirectCosts)
    const grossMargin = roundCurrency(data.revenue - data.directCosts)
    const netMargin = roundCurrency(data.revenue - totalCosts)

    const fteData = fteMap.get(clientId)
    const fte = fteData?.fte ?? null

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
      headcountFte: fte,
      revenuePerFte: fte && fte > 0 ? roundCurrency(data.revenue / fte) : null,
      costPerFte: fte && fte > 0 ? roundCurrency(totalCosts / fte) : null,
      notes
    })

    // Enrich with LTV/CAC (computed, not stored)
    const cac = cacMap.get(clientId) ?? null
    const ltv = ltvMap.get(clientId) ?? null

    snapshot.acquisitionCostClp = cac && cac > 0 ? roundCurrency(cac) : null
    snapshot.ltvToCacRatio = cac && cac > 0 && ltv != null
      ? roundCurrency(ltv / cac)
      : null

    results.push(snapshot)
  }

  return results
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

/**
 * Returns client economics snapshots across multiple periods for trend analysis.
 * If clientId is provided, returns only that client's history.
 * Otherwise returns all clients for the last N months.
 */
export const listClientEconomicsTrend = async (
  clientId: string | null,
  months: number
): Promise<ClientEconomicsRecord[]> => {
  await assertFinanceSlice2PostgresReady()

  // Compute period range: from (now - months) to now
  const now = new Date()
  const endYear = now.getFullYear()
  const endMonth = now.getMonth() + 1

  let startYear = endYear
  let startMonth = endMonth - months + 1

  while (startMonth < 1) {
    startMonth += 12
    startYear -= 1
  }

  if (clientId) {
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
        WHERE client_id = $1
          AND (period_year > $2 OR (period_year = $2 AND period_month >= $3))
          AND (period_year < $4 OR (period_year = $4 AND period_month <= $5))
        ORDER BY period_year ASC, period_month ASC
      `,
      [clientId, startYear, startMonth, endYear, endMonth]
    )

    return rows.map(mapClientEconomics)
  }

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
      WHERE (period_year > $1 OR (period_year = $1 AND period_month >= $2))
        AND (period_year < $3 OR (period_year = $3 AND period_month <= $4))
      ORDER BY client_name ASC, period_year ASC, period_month ASC
    `,
    [startYear, startMonth, endYear, endMonth]
  )

  return rows.map(mapClientEconomics)
}
