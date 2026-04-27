import 'server-only'

import { STATIC_RELIABILITY_REGISTRY } from '@/lib/reliability/registry'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeReliabilityModuleSummary, HomeReliabilityRibbonData, ReliabilityModuleStatus } from '../contract'

const STATUS_PRIORITY: Record<ReliabilityModuleStatus, number> = {
  down: 4,
  degraded: 3,
  unknown: 2,
  healthy: 1
}

/**
 * Lightweight reliability rollup for the home aside.
 *
 * Trades the full `getReliabilityOverview()` (which aggregates billing +
 * Notion ops + synthetic snapshots + smoke lane and takes 3-4s) for a
 * direct-from-registry list with cheap recent-incident counts. Total
 * latency budget: <1s. Full detail is one click away on `/admin/operations`.
 */

interface RecentIncidentRow {
  domain_tag: string
  open_count: number | string
  last_observed_at: string | null
}

const fetchRecentIncidentsByDomain = async (): Promise<Record<string, RecentIncidentRow>> => {
  try {
    const rows = await runGreenhousePostgresQuery<RecentIncidentRow & Record<string, unknown>>(
      `WITH per_domain AS (
         SELECT
           tags->>'domain' AS domain_tag,
           COUNT(*) FILTER (WHERE resolved_at IS NULL) AS open_count,
           MAX(observed_at) AS last_observed_at
         FROM greenhouse_serving.reliability_incident_log
        WHERE observed_at > NOW() - INTERVAL '7 days'
        GROUP BY tags->>'domain'
       )
       SELECT domain_tag, open_count, last_observed_at FROM per_domain WHERE domain_tag IS NOT NULL`
    )

    return rows.reduce<Record<string, RecentIncidentRow>>((acc, row) => {
      acc[row.domain_tag] = row

      return acc
    }, {})
  } catch {
    return {}
  }
}

export const loadHomeReliabilityRibbon = async (): Promise<HomeReliabilityRibbonData> => {
  const recentIncidents = await fetchRecentIncidentsByDomain()

  const modules: HomeReliabilityModuleSummary[] = STATIC_RELIABILITY_REGISTRY.map(definition => {
    const incident = definition.incidentDomainTag ? recentIncidents[definition.incidentDomainTag] : undefined

    const openCount = incident ? Number(incident.open_count) : 0

    let status: ReliabilityModuleStatus = 'healthy'

    if (openCount > 2) status = 'down'
    else if (openCount > 0) status = 'degraded'

    return {
      moduleKey: definition.moduleKey,
      label: definition.label,
      status,
      incidentsOpen: openCount,
      lastIncidentAt: incident?.last_observed_at ?? null
    }
  })

  const rollup = modules.reduce<ReliabilityModuleStatus>((acc, module) => {
    return STATUS_PRIORITY[module.status] > STATUS_PRIORITY[acc] ? module.status : acc
  }, 'healthy')

  return {
    rollup,
    modules,
    degradedSources: [],
    asOf: new Date().toISOString()
  }
}
