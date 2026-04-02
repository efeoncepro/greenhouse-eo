import 'server-only'

import { readCommercialCostAttributionByClientForPeriod } from '@/lib/commercial-cost-attribution/member-period-attribution'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { roundCurrency } from '@/lib/finance/shared'
import { getOrganizationDetail } from './organization-store'

// ── Types ──

export interface OrganizationEconomicsPeriod {
  organizationId: string
  periodYear: number
  periodMonth: number
  closureStatus: string | null
  periodClosed: boolean
  snapshotRevision: number | null
  totalRevenueClp: number
  totalLaborCostClp: number
  totalDirectCostsClp: number
  totalIndirectCostsClp: number
  adjustedMarginClp: number
  adjustedMarginPercent: number | null
  activeFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
  clientCount: number
}

export interface OrganizationEconomicsTrendPoint {
  periodYear: number
  periodMonth: number
  closureStatus: string | null
  periodClosed: boolean
  snapshotRevision: number | null
  totalRevenueClp: number
  totalLaborCostClp: number
  adjustedMarginClp: number
  adjustedMarginPercent: number | null
  activeFte: number | null
}

export interface ClientProfitabilityRow {
  clientId: string
  clientName: string
  closureStatus: string | null
  periodClosed: boolean
  snapshotRevision: number | null
  revenueClp: number
  laborCostClp: number
  directCostsClp: number
  marginClp: number
  marginPercent: number | null
  headcountFte: number | null
}

// ── Postgres row types ──

interface EconomicsRow extends Record<string, unknown> {
  client_id: string
  client_name: string
  total_revenue_clp: string | number
  direct_costs_clp: string | number
  indirect_costs_clp: string | number
  headcount_fte: string | number | null
}

interface OperationalPlServingRow extends Record<string, unknown> {
  scope_id: string
  scope_name: string
  period_year: string | number
  period_month: string | number
  closure_status: string | null
  period_closed: boolean | null
  snapshot_revision: string | number | null
  revenue_clp: string | number
  labor_cost_clp: string | number
  direct_expense_clp: string | number
  overhead_clp: string | number
  gross_margin_clp: string | number
  gross_margin_pct: string | number | null
  headcount_fte: string | number | null
  revenue_per_fte_clp: string | number | null
  cost_per_fte_clp: string | number | null
  client_count: string | number | null
}

// ── Core functions ──

/**
 * Get unified economics for an organization for a single period.
 * Correlates finance snapshots with canonical commercial cost attribution.
 */
export const getOrganizationEconomics = async (
  orgId: string,
  year: number,
  month: number
): Promise<OrganizationEconomicsPeriod> => {
  const servingSnapshot = await queryOrganizationServingSnapshot(orgId, year, month)

  if (servingSnapshot) {
    const clientCount = await countOrganizationServingClients(orgId, year, month)

    return {
      ...mapOrganizationServingSnapshot(orgId, servingSnapshot),
      clientCount
    }
  }

  // 1. Get finance snapshots for org's clients
  const financeRows = await queryOrgFinanceRows(orgId, year, month)

  // 2. Get canonical client commercial cost summary for the period
  const commercialCostRows = await readCommercialCostAttributionByClientForPeriod(year, month)

  const laborByClient = new Map(
    commercialCostRows.map(row => [row.clientId, row])
  )

  // 3. Aggregate
  let totalRevenue = 0
  let totalLaborCost = 0
  let totalDirectCosts = 0
  let totalIndirectCosts = 0
  let totalFte = 0

  for (const row of financeRows) {
    const rev = toNum(row.total_revenue_clp)
    const direct = toNum(row.direct_costs_clp)
    const indirect = toNum(row.indirect_costs_clp)
    const labor = laborByClient.get(String(row.client_id))
    const laborCost = labor?.laborCostClp ?? 0
    const nonLaborDirect = Math.max(0, direct - laborCost)

    totalRevenue += rev
    totalDirectCosts += nonLaborDirect
    totalIndirectCosts += indirect
    totalLaborCost += laborCost
    totalFte += labor?.headcountFte ?? toNum(row.headcount_fte)
  }

  const adjustedMargin = roundCurrency(totalRevenue - totalLaborCost - totalDirectCosts - totalIndirectCosts)

  const adjustedMarginPercent = totalRevenue > 0
    ? Math.round((adjustedMargin / totalRevenue) * 10000) / 100
    : null

  return {
    organizationId: orgId,
    periodYear: year,
    periodMonth: month,
    closureStatus: null,
    periodClosed: false,
    snapshotRevision: null,
    totalRevenueClp: roundCurrency(totalRevenue),
    totalLaborCostClp: roundCurrency(totalLaborCost),
    totalDirectCostsClp: roundCurrency(totalDirectCosts),
    totalIndirectCostsClp: roundCurrency(totalIndirectCosts),
    adjustedMarginClp: adjustedMargin,
    adjustedMarginPercent,
    activeFte: totalFte > 0 ? Math.round(totalFte * 100) / 100 : null,
    revenuePerFte: totalFte > 0 ? roundCurrency(totalRevenue / totalFte) : null,
    costPerFte: totalFte > 0 ? roundCurrency((totalLaborCost + totalDirectCosts + totalIndirectCosts) / totalFte) : null,
    clientCount: financeRows.length
  }
}

/**
 * Get economics trend for N months back from current period.
 */
export const getOrganizationEconomicsTrend = async (
  orgId: string,
  months: number = 6
): Promise<OrganizationEconomicsTrendPoint[]> => {
  const servingTrend = await queryOrganizationServingTrend(orgId, months)

  if (servingTrend.length > 0) {
    return servingTrend.map(mapOrganizationTrendPoint)
  }

  const now = new Date()
  const points: OrganizationEconomicsTrendPoint[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    const econ = await getOrganizationEconomics(orgId, year, month)

    points.push({
      periodYear: year,
      periodMonth: month,
      closureStatus: econ.closureStatus,
      periodClosed: econ.periodClosed,
      snapshotRevision: econ.snapshotRevision,
      totalRevenueClp: econ.totalRevenueClp,
      totalLaborCostClp: econ.totalLaborCostClp,
      adjustedMarginClp: econ.adjustedMarginClp,
      adjustedMarginPercent: econ.adjustedMarginPercent,
      activeFte: econ.activeFte
    })
  }

  return points
}

/**
 * Get per-client profitability breakdown for an organization.
 */
export const getOrganizationProfitabilityBreakdown = async (
  orgId: string,
  year: number,
  month: number
): Promise<ClientProfitabilityRow[]> => {
  const servingRows = await queryOrganizationClientServingBreakdown(orgId, year, month)

  if (servingRows.length > 0) {
    return servingRows.map(row => ({
      clientId: String(row.scope_id),
      clientName: String(row.scope_name),
      closureStatus: row.closure_status,
      periodClosed: toBool(row.period_closed),
      snapshotRevision: row.snapshot_revision != null ? toNum(row.snapshot_revision) : null,
      revenueClp: roundCurrency(toNum(row.revenue_clp)),
      laborCostClp: roundCurrency(toNum(row.labor_cost_clp)),
      directCostsClp: roundCurrency(toNum(row.direct_expense_clp)),
      marginClp: roundCurrency(toNum(row.gross_margin_clp)),
      marginPercent: row.gross_margin_pct != null ? Math.round(toNum(row.gross_margin_pct) * 100) / 100 : null,
      headcountFte: row.headcount_fte != null ? toNum(row.headcount_fte) : null
    }))
  }

  const financeRows = await queryOrgFinanceRows(orgId, year, month)
  const commercialCostRows = await readCommercialCostAttributionByClientForPeriod(year, month)
  const laborByClient = new Map(commercialCostRows.map(row => [row.clientId, row]))

  return financeRows.map(row => {
    const rev = toNum(row.total_revenue_clp)
    const direct = toNum(row.direct_costs_clp)
    const indirect = toNum(row.indirect_costs_clp)
    const labor = laborByClient.get(String(row.client_id))
    const laborCost = labor?.laborCostClp ?? 0
    const nonLaborDirect = Math.max(0, direct - laborCost)
    const marginClp = roundCurrency(rev - laborCost - nonLaborDirect - indirect)

    return {
      clientId: String(row.client_id),
      clientName: String(row.client_name),
      closureStatus: null,
      periodClosed: false,
      snapshotRevision: null,
      revenueClp: roundCurrency(rev),
      laborCostClp: roundCurrency(laborCost),
      directCostsClp: roundCurrency(nonLaborDirect),
      marginClp,
      marginPercent: rev > 0 ? Math.round((marginClp / rev) * 10000) / 100 : null,
      headcountFte: labor?.headcountFte ?? (row.headcount_fte != null ? toNum(row.headcount_fte) : null)
    }
  })
}

/**
 * Get ICO summary for an organization (on-read from BigQuery via existing infrastructure).
 * Returns null if ICO engine is not available.
 */
export const getOrganizationIcoSummary = async (
  orgId: string,
  year: number,
  month: number
): Promise<{
  avgRpa: number | null
  avgOtdPct: number | null
  avgFtrPct: number | null
  totalTasks: number
  completedTasks: number
} | null> => {
  try {
    // Dynamically import to avoid hard dependency on ICO engine
    const { ensureIcoEngineInfrastructure } = await import('@/lib/ico-engine/schema')
    const { readSpaceMetrics, computeSpaceMetricsLive } = await import('@/lib/ico-engine/read-metrics')

    await ensureIcoEngineInfrastructure()

    const detail = await getOrganizationDetail(orgId)

    if (!detail) return null

    const activeSpaces = (detail.spaces ?? []).filter(s => s.status === 'active' && s.spaceId)

    if (activeSpaces.length === 0) return null

    const snapshots = await Promise.all(
      activeSpaces.map(async space => {
        const snap = await readSpaceMetrics(space.spaceId, year, month)

        return snap || await computeSpaceMetricsLive(space.spaceId, year, month)
      })
    )

    const validSnapshots = snapshots.filter(Boolean)

    if (validSnapshots.length === 0) return null

    let rpaSum = 0
    let rpaCount = 0
    let otdSum = 0
    let otdCount = 0
    let ftrSum = 0
    let ftrCount = 0
    let totalTasks = 0
    let completedTasks = 0

    for (const snap of validSnapshots) {
      if (!snap) continue

      totalTasks += snap.context.totalTasks
      completedTasks += snap.context.completedTasks

      for (const m of snap.metrics) {
        if (m.value === null) continue

        if (m.metricId === 'rpa') { rpaSum += m.value; rpaCount++ }
        if (m.metricId === 'otd_pct') { otdSum += m.value; otdCount++ }
        if (m.metricId === 'ftr_pct') { ftrSum += m.value; ftrCount++ }
      }
    }

    return {
      avgRpa: rpaCount > 0 ? Math.round((rpaSum / rpaCount) * 100) / 100 : null,
      avgOtdPct: otdCount > 0 ? Math.round((otdSum / otdCount) * 100) / 100 : null,
      avgFtrPct: ftrCount > 0 ? Math.round((ftrSum / ftrCount) * 100) / 100 : null,
      totalTasks,
      completedTasks
    }
  } catch {
    // ICO Engine not available — non-critical
    return null
  }
}

/**
 * Get team intelligence summary from person_operational_360 for an organization's members.
 * Aggregates quality/dedication/cost metrics across all active members assigned to the org's spaces.
 */
export const getOrganizationTeamIntelligence = async (
  orgId: string,
  year: number,
  month: number
): Promise<{
  memberCount: number
  avgQualityIndex: number | null
  avgDedicationIndex: number | null
  avgUtilizationPct: number | null
  totalCostPerAsset: number | null
  avgRpa: number | null
  avgOtdPct: number | null
} | null> => {
  try {
    interface TeamIntelRow extends Record<string, unknown> {
      member_count: string | number
      avg_quality: string | number | null
      avg_dedication: string | number | null
      avg_utilization: string | number | null
      avg_cost_per_asset: string | number | null
      avg_rpa: string | number | null
      avg_otd: string | number | null
    }

    const rows = await runGreenhousePostgresQuery<TeamIntelRow>(`
      SELECT
        COUNT(DISTINCT po.member_id) AS member_count,
        AVG(po.quality_index) AS avg_quality,
        AVG(po.dedication_index) AS avg_dedication,
        AVG(po.utilization_pct) AS avg_utilization,
        AVG(po.cost_per_asset) AS avg_cost_per_asset,
        AVG(po.rpa_avg) AS avg_rpa,
        AVG(po.otd_pct) AS avg_otd
      FROM greenhouse_serving.person_operational_360 po
      JOIN greenhouse_core.client_team_assignments a ON a.member_id = po.member_id AND a.active = TRUE
      JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.organization_id = $1
      WHERE po.period_year = $2 AND po.period_month = $3
    `, [orgId, year, month])

    if (rows.length === 0) return null

    const r = rows[0]
    const mc = toNum(r.member_count)

    if (mc === 0) return null

    return {
      memberCount: mc,
      avgQualityIndex: r.avg_quality != null ? Math.round(toNum(r.avg_quality)) : null,
      avgDedicationIndex: r.avg_dedication != null ? Math.round(toNum(r.avg_dedication)) : null,
      avgUtilizationPct: r.avg_utilization != null ? Math.round(toNum(r.avg_utilization) * 10) / 10 : null,
      totalCostPerAsset: r.avg_cost_per_asset != null ? Math.round(toNum(r.avg_cost_per_asset)) : null,
      avgRpa: r.avg_rpa != null ? Math.round(toNum(r.avg_rpa) * 100) / 100 : null,
      avgOtdPct: r.avg_otd != null ? Math.round(toNum(r.avg_otd) * 10) / 10 : null
    }
  } catch {
    return null
  }
}

// ── Internal helpers ──

const mapOrganizationServingSnapshot = (
  orgId: string,
  row: OperationalPlServingRow
): OrganizationEconomicsPeriod => ({
  organizationId: orgId,
  periodYear: toNum(row.period_year),
  periodMonth: toNum(row.period_month),
  closureStatus: row.closure_status,
  periodClosed: toBool(row.period_closed),
  snapshotRevision: row.snapshot_revision != null ? toNum(row.snapshot_revision) : null,
  totalRevenueClp: roundCurrency(toNum(row.revenue_clp)),
  totalLaborCostClp: roundCurrency(toNum(row.labor_cost_clp)),
  totalDirectCostsClp: roundCurrency(toNum(row.direct_expense_clp)),
  totalIndirectCostsClp: roundCurrency(toNum(row.overhead_clp)),
  adjustedMarginClp: roundCurrency(toNum(row.gross_margin_clp)),
  adjustedMarginPercent: row.gross_margin_pct != null ? Math.round(toNum(row.gross_margin_pct) * 100) / 100 : null,
  activeFte: row.headcount_fte != null ? Math.round(toNum(row.headcount_fte) * 100) / 100 : null,
  revenuePerFte: row.revenue_per_fte_clp != null ? roundCurrency(toNum(row.revenue_per_fte_clp)) : null,
  costPerFte: row.cost_per_fte_clp != null ? roundCurrency(toNum(row.cost_per_fte_clp)) : null,
  clientCount: row.client_count != null ? toNum(row.client_count) : 0
})

const mapOrganizationTrendPoint = (row: OperationalPlServingRow): OrganizationEconomicsTrendPoint => ({
  periodYear: toNum(row.period_year),
  periodMonth: toNum(row.period_month),
  closureStatus: row.closure_status,
  periodClosed: toBool(row.period_closed),
  snapshotRevision: row.snapshot_revision != null ? toNum(row.snapshot_revision) : null,
  totalRevenueClp: roundCurrency(toNum(row.revenue_clp)),
  totalLaborCostClp: roundCurrency(toNum(row.labor_cost_clp)),
  adjustedMarginClp: roundCurrency(toNum(row.gross_margin_clp)),
  adjustedMarginPercent: row.gross_margin_pct != null ? Math.round(toNum(row.gross_margin_pct) * 100) / 100 : null,
  activeFte: row.headcount_fte != null ? Math.round(toNum(row.headcount_fte) * 100) / 100 : null
})

const queryOrganizationServingSnapshot = async (
  orgId: string,
  year: number,
  month: number
): Promise<OperationalPlServingRow | null> => {
  const rows = await runGreenhousePostgresQuery<OperationalPlServingRow>(
    `
      SELECT
        ops.scope_id,
        ops.scope_name,
        ops.period_year,
        ops.period_month,
        pcs.closure_status,
        ops.period_closed,
        ops.snapshot_revision,
        ops.revenue_clp,
        ops.labor_cost_clp,
        ops.direct_expense_clp,
        ops.overhead_clp,
        ops.gross_margin_clp,
        ops.gross_margin_pct,
        ops.headcount_fte,
        ops.revenue_per_fte_clp,
        ops.cost_per_fte_clp,
        (
          SELECT COUNT(DISTINCT s.client_id)
          FROM greenhouse_core.spaces s
          WHERE s.organization_id = $1
            AND s.active = TRUE
            AND s.client_id IS NOT NULL
        ) AS client_count
      FROM greenhouse_serving.operational_pl_snapshots ops
      LEFT JOIN greenhouse_serving.period_closure_status pcs
        ON pcs.period_year = ops.period_year
       AND pcs.period_month = ops.period_month
      WHERE ops.scope_type = 'organization'
        AND ops.scope_id = $1
        AND ops.period_year = $2
        AND ops.period_month = $3
      ORDER BY ops.snapshot_revision DESC
      LIMIT 1
    `,
    [orgId, year, month]
  ).catch(() => [])

  return rows[0] ?? null
}

const queryOrganizationServingTrend = async (
  orgId: string,
  months: number
): Promise<OperationalPlServingRow[]> =>
  runGreenhousePostgresQuery<OperationalPlServingRow>(
    `
      WITH ranked_revisions AS (
        SELECT
          ops.scope_id,
          ops.scope_name,
          ops.period_year,
          ops.period_month,
          pcs.closure_status,
          ops.period_closed,
          ops.snapshot_revision,
          ops.revenue_clp,
          ops.labor_cost_clp,
          ops.direct_expense_clp,
          ops.overhead_clp,
          ops.gross_margin_clp,
          ops.gross_margin_pct,
          ops.headcount_fte,
          ops.revenue_per_fte_clp,
          ops.cost_per_fte_clp,
          NULL::int AS client_count,
          ROW_NUMBER() OVER (
            PARTITION BY ops.scope_id, ops.period_year, ops.period_month
            ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
          ) AS revision_rank
        FROM greenhouse_serving.operational_pl_snapshots ops
        LEFT JOIN greenhouse_serving.period_closure_status pcs
          ON pcs.period_year = ops.period_year
         AND pcs.period_month = ops.period_month
        WHERE ops.scope_type = 'organization'
          AND ops.scope_id = $1
      )
      SELECT
        scope_id,
        scope_name,
        period_year,
        period_month,
        closure_status,
        period_closed,
        snapshot_revision,
        revenue_clp,
        labor_cost_clp,
        direct_expense_clp,
        overhead_clp,
        gross_margin_clp,
        gross_margin_pct,
        headcount_fte,
        revenue_per_fte_clp,
        cost_per_fte_clp,
        client_count
      FROM ranked_revisions
      WHERE revision_rank = 1
      ORDER BY period_year DESC, period_month DESC
      LIMIT $2
    `,
    [orgId, Math.max(1, Math.min(months, 12))]
  ).catch(() => [])

const queryOrganizationClientServingBreakdown = async (
  orgId: string,
  year: number,
  month: number
): Promise<OperationalPlServingRow[]> =>
  runGreenhousePostgresQuery<OperationalPlServingRow>(
    `
      WITH org_clients AS (
        SELECT DISTINCT client_id
        FROM greenhouse_core.spaces
        WHERE organization_id = $1
          AND active = TRUE
          AND client_id IS NOT NULL
      ),
      ranked_revisions AS (
        SELECT
          ops.scope_id,
          ops.scope_name,
          ops.period_year,
          ops.period_month,
          pcs.closure_status,
          ops.period_closed,
          ops.snapshot_revision,
          ops.revenue_clp,
          ops.labor_cost_clp,
          ops.direct_expense_clp,
          ops.overhead_clp,
          ops.gross_margin_clp,
          ops.gross_margin_pct,
          ops.headcount_fte,
          ops.revenue_per_fte_clp,
          ops.cost_per_fte_clp,
          NULL::int AS client_count,
          ROW_NUMBER() OVER (
            PARTITION BY ops.scope_id, ops.period_year, ops.period_month
            ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
          ) AS revision_rank
        FROM greenhouse_serving.operational_pl_snapshots ops
        INNER JOIN org_clients oc
          ON oc.client_id = ops.scope_id
        LEFT JOIN greenhouse_serving.period_closure_status pcs
          ON pcs.period_year = ops.period_year
         AND pcs.period_month = ops.period_month
        WHERE ops.scope_type = 'client'
          AND ops.period_year = $2
          AND ops.period_month = $3
      )
      SELECT
        scope_id,
        scope_name,
        period_year,
        period_month,
        closure_status,
        period_closed,
        snapshot_revision,
        revenue_clp,
        labor_cost_clp,
        direct_expense_clp,
        overhead_clp,
        gross_margin_clp,
        gross_margin_pct,
        headcount_fte,
        revenue_per_fte_clp,
        cost_per_fte_clp,
        client_count
      FROM ranked_revisions
      WHERE revision_rank = 1
      ORDER BY revenue_clp DESC, scope_name ASC
    `,
    [orgId, year, month]
  ).catch(() => [])

const countOrganizationServingClients = async (
  orgId: string,
  year: number,
  month: number
): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: string | number } & Record<string, unknown>>(
    `
      WITH org_clients AS (
        SELECT DISTINCT client_id
        FROM greenhouse_core.spaces
        WHERE organization_id = $1
          AND active = TRUE
          AND client_id IS NOT NULL
      ),
      latest_client_snapshots AS (
        SELECT
          ops.scope_id,
          ROW_NUMBER() OVER (
            PARTITION BY ops.scope_id, ops.period_year, ops.period_month
            ORDER BY ops.snapshot_revision DESC, ops.materialized_at DESC NULLS LAST
          ) AS revision_rank
        FROM greenhouse_serving.operational_pl_snapshots ops
        INNER JOIN org_clients oc
          ON oc.client_id = ops.scope_id
        WHERE ops.scope_type = 'client'
          AND ops.period_year = $2
          AND ops.period_month = $3
      )
      SELECT COUNT(*) AS total
      FROM latest_client_snapshots lcs
      WHERE lcs.revision_rank = 1
    `,
    [orgId, year, month]
  ).catch(() => [])

  return rows[0] ? toNum(rows[0].total) : 0
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  return 0
}

const toBool = (v: unknown): boolean =>
  v === true || v === 'true' || v === 't' || v === 1 || v === '1'

const queryOrgFinanceRows = async (
  orgId: string,
  year: number,
  month: number
): Promise<EconomicsRow[]> => {
  let rows = await runGreenhousePostgresQuery<EconomicsRow>(`
    SELECT
      ce.client_id, ce.client_name,
      ce.total_revenue_clp, ce.direct_costs_clp, ce.indirect_costs_clp,
      ce.headcount_fte
    FROM greenhouse_finance.client_economics ce
    WHERE ce.period_year = $2 AND ce.period_month = $3
      AND EXISTS (
        SELECT 1
        FROM greenhouse_finance.client_profiles cp
        WHERE cp.organization_id = $1
          AND (cp.client_id = ce.client_id OR cp.organization_id = ce.client_id)
      )
    ORDER BY ce.total_revenue_clp DESC
  `, [orgId, year, month])

  if (rows.length === 0) {
    await computeClientEconomicsSnapshots(year, month, `Auto-computed for org economics ${orgId}`)

    rows = await runGreenhousePostgresQuery<EconomicsRow>(`
      SELECT
        ce.client_id, ce.client_name,
        ce.total_revenue_clp, ce.direct_costs_clp, ce.indirect_costs_clp,
        ce.headcount_fte
      FROM greenhouse_finance.client_economics ce
      WHERE ce.period_year = $2 AND ce.period_month = $3
        AND EXISTS (
          SELECT 1
          FROM greenhouse_finance.client_profiles cp
          WHERE cp.organization_id = $1
            AND (cp.client_id = ce.client_id OR cp.organization_id = ce.client_id)
        )
      ORDER BY ce.total_revenue_clp DESC
    `, [orgId, year, month])
  }

  return rows
}
