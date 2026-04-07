import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonDeliveryFacet, FacetFetchContext } from '@/types/person-complete-360'

type DeliveryRow = {
  owned_projects_count: string | number
  active_owned_projects: string | number
  total_assigned_tasks: string | number
  active_tasks: string | number
  completed_tasks_30d: string | number
  overdue_tasks: string | number
  avg_rpa_30d: string | number | null
  on_time_pct_30d: string | number | null
  owned_companies_count: string | number
  owned_deals_count: string | number
  open_deals_amount: string | number
}

type ProjectRow = {
  project_id: string
  project_name: string
  status: string
  client_name: string | null
  active: boolean
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  
return Number.isFinite(n) ? n : null
}

export const fetchDeliveryFacet = async (ctx: FacetFetchContext): Promise<PersonDeliveryFacet | null> => {
  if (!ctx.memberId) return null

  const projectLimit = ctx.limit ?? 10

  // Try the serving view first for aggregate metrics
  const [metricsRows, projectRows] = await Promise.all([
    runGreenhousePostgresQuery<DeliveryRow>(
      `SELECT
        COALESCE(owned_projects_count, 0) AS owned_projects_count,
        COALESCE(active_owned_projects, 0) AS active_owned_projects,
        COALESCE(total_assigned_tasks, 0) AS total_assigned_tasks,
        COALESCE(active_tasks, 0) AS active_tasks,
        COALESCE(completed_tasks_30d, 0) AS completed_tasks_30d,
        COALESCE(overdue_tasks, 0) AS overdue_tasks,
        avg_rpa_30d,
        on_time_pct_30d,
        COALESCE(owned_companies_count, 0) AS owned_companies_count,
        COALESCE(owned_deals_count, 0) AS owned_deals_count,
        COALESCE(open_deals_amount, 0) AS open_deals_amount
      FROM greenhouse_serving.person_delivery_360
      WHERE member_id = $1
      LIMIT 1`,
      [ctx.memberId]
    ).catch(() => [] as DeliveryRow[]),

    runGreenhousePostgresQuery<ProjectRow>(
      `SELECT
        p.project_id,
        p.project_name,
        COALESCE(p.status, 'unknown') AS status,
        c.client_name,
        p.active
      FROM greenhouse_delivery.projects p
      LEFT JOIN greenhouse_core.clients c ON c.client_id = p.client_id
      WHERE p.owner_member_id = $1
        AND NOT p.is_deleted
      ORDER BY p.active DESC, p.updated_at DESC NULLS LAST
      LIMIT $2`,
      [ctx.memberId, projectLimit]
    ).catch(() => [] as ProjectRow[])
  ])

  const metrics = metricsRows[0]

  return {
    icoMetrics: {
      rpaAvg: toNullNum(metrics?.avg_rpa_30d),
      rpaMedian: null, // not available in current view
      otdPct: toNullNum(metrics?.on_time_pct_30d),
      ftrPct: null, // not available in current view
      throughputCount: toNum(metrics?.completed_tasks_30d),
      cycleTimeAvg: null, // not available in current view
      stuckAssetCount: toNum(metrics?.overdue_tasks)
    },
    projectCount: toNum(metrics?.owned_projects_count),
    activeProjectCount: toNum(metrics?.active_owned_projects),
    activeTaskCount: toNum(metrics?.active_tasks),
    completedTaskCount: toNum(metrics?.completed_tasks_30d),
    overdueTaskCount: toNum(metrics?.overdue_tasks),
    ownedProjects: projectRows.map(r => ({
      projectId: r.project_id,
      name: r.project_name,
      status: r.status,
      clientName: r.client_name,
      active: r.active
    })),
    crm: {
      ownedCompanies: toNum(metrics?.owned_companies_count),
      ownedDeals: toNum(metrics?.owned_deals_count),
      openDealsAmount: toNum(metrics?.open_deals_amount)
    }
  }
}
