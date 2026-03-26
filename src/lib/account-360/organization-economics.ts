import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { computeClientLaborCosts } from '@/lib/finance/payroll-cost-allocation'
import { roundCurrency, toNumber } from '@/lib/finance/shared'
import { getOrganizationDetail } from './organization-store'

// ── Types ──

export interface OrganizationEconomicsPeriod {
  organizationId: string
  periodYear: number
  periodMonth: number
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
  totalRevenueClp: number
  totalLaborCostClp: number
  adjustedMarginClp: number
  adjustedMarginPercent: number | null
  activeFte: number | null
}

export interface ClientProfitabilityRow {
  clientId: string
  clientName: string
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

// ── Core functions ──

/**
 * Get unified economics for an organization for a single period.
 * Correlates client_economics (revenue, costs) with client_labor_cost_allocation (real payroll cost).
 */
export const getOrganizationEconomics = async (
  orgId: string,
  year: number,
  month: number
): Promise<OrganizationEconomicsPeriod> => {
  // 1. Get finance snapshots for org's clients
  const financeRows = await queryOrgFinanceRows(orgId, year, month)

  // 2. Get real labor costs from payroll allocation
  const laborCosts = await computeClientLaborCosts(year, month)

  // Build labor cost lookup by client_id
  const laborByClient = new Map(laborCosts.map(lc => [lc.clientId, lc]))

  // Collect client IDs from the org's finance data
  const orgClientIds = new Set(financeRows.map(r => String(r.client_id)))

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
    const laborCost = labor?.allocatedLaborClp ?? 0
    const nonLaborDirect = Math.max(0, direct - laborCost)

    totalRevenue += rev
    totalDirectCosts += nonLaborDirect
    totalIndirectCosts += indirect
    totalLaborCost += laborCost
    totalFte += labor?.headcountFte ?? toNum(row.headcount_fte)
  }

  // Also include labor costs for clients in this org that may not have revenue
  for (const lc of laborCosts) {
    if (!orgClientIds.has(lc.clientId)) continue

    // Already counted above
  }

  const adjustedMargin = roundCurrency(totalRevenue - totalLaborCost - totalDirectCosts - totalIndirectCosts)

  const adjustedMarginPercent = totalRevenue > 0
    ? Math.round((adjustedMargin / totalRevenue) * 10000) / 100
    : null

  return {
    organizationId: orgId,
    periodYear: year,
    periodMonth: month,
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
  const financeRows = await queryOrgFinanceRows(orgId, year, month)
  const laborCosts = await computeClientLaborCosts(year, month)
  const laborByClient = new Map(laborCosts.map(lc => [lc.clientId, lc]))

  return financeRows.map(row => {
    const rev = toNum(row.total_revenue_clp)
    const direct = toNum(row.direct_costs_clp)
    const indirect = toNum(row.indirect_costs_clp)
    const labor = laborByClient.get(String(row.client_id))
    const laborCost = labor?.allocatedLaborClp ?? 0
    const nonLaborDirect = Math.max(0, direct - laborCost)
    const marginClp = roundCurrency(rev - laborCost - nonLaborDirect - indirect)

    return {
      clientId: String(row.client_id),
      clientName: String(row.client_name),
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

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  return 0
}

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
    JOIN greenhouse_finance.client_profiles cp ON cp.client_id = ce.client_id
    WHERE cp.organization_id = $1 AND ce.period_year = $2 AND ce.period_month = $3
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
      JOIN greenhouse_finance.client_profiles cp ON cp.client_id = ce.client_id
      WHERE cp.organization_id = $1 AND ce.period_year = $2 AND ce.period_month = $3
      ORDER BY ce.total_revenue_clp DESC
    `, [orgId, year, month])
  }

  return rows
}
