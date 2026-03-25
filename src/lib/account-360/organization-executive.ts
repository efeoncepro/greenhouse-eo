import 'server-only'

import { getOrganizationEconomics, getOrganizationEconomicsTrend } from './organization-economics'
import { getOrganizationProjects } from './organization-projects'

/**
 * Organization Executive Snapshot — Consolidated serving read model.
 *
 * Combines economics, projects health, and DTE coverage into a single
 * reusable response. Used by org detail overview, Home, and future APIs.
 *
 * Specialized breakdowns (per-client economics, per-space projects, DTE proposals)
 * remain in their own endpoints — this is the summary layer.
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

  // Parallel fetch: economics + projects + trend
  const [economicsResult, projectsResult, trendResult] = await Promise.allSettled([
    getOrganizationEconomics(organizationId, year, month),
    getOrganizationProjects(organizationId),
    getOrganizationEconomicsTrend(organizationId, trendMonths)
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
    trend,
    computedAt: new Date().toISOString()
  }
}
