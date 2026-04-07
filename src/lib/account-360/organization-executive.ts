import 'server-only'

import { getOrganizationEconomics, getOrganizationEconomicsTrend } from './organization-economics'
import { getOrganizationProjects } from './organization-projects'
import { getOrganizationOperationalServing } from './get-organization-operational-serving'
import type { OrganizationOperationalServing } from './get-organization-operational-serving'
import { getDteCoverageSummary } from '@/lib/finance/dte-coverage'
import type { DteCoverageSummary } from '@/lib/finance/dte-coverage'

/**
 * Organization Executive Snapshot — Consolidated serving read model.
 *
 * Combines economics, projects health, and DTE coverage into a single
 * reusable response. Used by org detail overview, Home, and future APIs.
 *
 * Specialized breakdowns (per-client economics, per-space projects, DTE proposals)
 * remain in their own endpoints — this is the summary layer.
 *
 * @deprecated Use `getAccountComplete360(orgId, { facets: ['identity', 'economics', 'delivery', 'finance'] })`
 * from `@/lib/account-360/account-complete-360` instead. This monolithic function is superseded
 * by the federated Account Complete 360 resolver (TASK-274).
 */

export interface OrganizationExecutiveSnapshot {
  organizationId: string
  periodYear: number
  periodMonth: number

  // Economics summary
  economics: {
    totalRevenueClp: number
    totalLaborCostClp: number
    adjustedMarginClp: number
    adjustedMarginPercent: number | null
    activeFte: number | null
    clientCount: number
  } | null

  // Delivery health summary
  delivery: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  } | null

  // Operational metrics (ICO derived)
  operations: OrganizationOperationalServing['current'] | null

  // Tax health summary (DTE coverage)
  taxHealth: DteCoverageSummary | null

  // Economics trend (last N months)
  trend: Array<{
    periodYear: number
    periodMonth: number
    totalRevenueClp: number
    totalLaborCostClp: number
    adjustedMarginClp: number
    adjustedMarginPercent: number | null
  }> | null

  // Metadata
  computedAt: string
}

export const getOrganizationExecutiveSnapshot = async (
  organizationId: string,
  options?: { year?: number; month?: number; trendMonths?: number }
): Promise<OrganizationExecutiveSnapshot> => {
  const now = new Date()
  const year = options?.year ?? now.getFullYear()
  const month = options?.month ?? (now.getMonth() + 1)
  const trendMonths = options?.trendMonths ?? 6

  // Parallel fetch: economics + projects + trend + operations + tax
  const [economicsResult, projectsResult, trendResult, operationsResult, taxResult] = await Promise.allSettled([
    getOrganizationEconomics(organizationId, year, month),
    getOrganizationProjects(organizationId),
    getOrganizationEconomicsTrend(organizationId, trendMonths),
    getOrganizationOperationalServing(organizationId),
    getDteCoverageSummary(organizationId, year, month)
  ])

  // Economics
  let economics: OrganizationExecutiveSnapshot['economics'] = null

  if (economicsResult.status === 'fulfilled' && economicsResult.value) {
    const e = economicsResult.value

    economics = {
      totalRevenueClp: e.totalRevenueClp,
      totalLaborCostClp: e.totalLaborCostClp,
      adjustedMarginClp: e.adjustedMarginClp,
      adjustedMarginPercent: e.adjustedMarginPercent,
      activeFte: e.activeFte,
      clientCount: e.clientCount
    }
  }

  // Delivery
  let delivery: OrganizationExecutiveSnapshot['delivery'] = null

  if (projectsResult.status === 'fulfilled' && projectsResult.value) {
    const p = projectsResult.value.totals

    delivery = {
      totalProjects: p.totalProjects,
      activeProjects: p.activeProjects,
      totalTasks: p.totalTasks,
      completedTasks: p.completedTasks,
      avgRpa: p.avgRpa,
      overallHealth: p.overallHealth
    }
  }

  // Operations
  let operations: OrganizationExecutiveSnapshot['operations'] = null

  if (operationsResult.status === 'fulfilled' && operationsResult.value?.hasData) {
    operations = operationsResult.value.current
  }

  // Tax health
  let taxHealth: OrganizationExecutiveSnapshot['taxHealth'] = null

  if (taxResult.status === 'fulfilled' && taxResult.value) {
    taxHealth = taxResult.value
  }

  // Trend
  let trend: OrganizationExecutiveSnapshot['trend'] = null

  if (trendResult.status === 'fulfilled' && trendResult.value) {
    trend = trendResult.value.map(t => ({
      periodYear: t.periodYear,
      periodMonth: t.periodMonth,
      totalRevenueClp: t.totalRevenueClp,
      totalLaborCostClp: t.totalLaborCostClp,
      adjustedMarginClp: t.adjustedMarginClp,
      adjustedMarginPercent: t.adjustedMarginPercent
    }))
  }

  return {
    organizationId,
    periodYear: year,
    periodMonth: month,
    economics,
    delivery,
    operations,
    taxHealth,
    trend,
    computedAt: new Date().toISOString()
  }
}
