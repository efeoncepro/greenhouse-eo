import 'server-only'

import { getOrganizationClientIds } from '@/lib/account-360/organization-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePersonIdentifier } from '@/lib/person-360/resolve-eo-id'

// ── Types ──

export interface PersonDeliveryContext {
  identityProfileId: string
  eoId: string
  memberId: string
  displayName: string
  email: string | null
  departmentName: string | null
  projects: {
    ownedCount: number
    activeOwnedCount: number
  }
  tasks: {
    totalAssigned: number
    active: number
    completed30d: number
    overdue: number
    avgRpa30d: number | null
    onTimePct30d: number | null
  }
  crm: {
    ownedCompanies: number
    ownedDeals: number
    openDealsAmount: number
  }
}

type DeliveryRow = {
  identity_profile_id: string
  eo_id: string
  member_id: string
  resolved_display_name: string
  member_email: string | null
  department_name: string | null
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

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  return Number.isFinite(n) ? n : null
}

const str = (v: string | null | undefined): string | null =>
  v ? v.trim() || null : null

const mapRow = (row: DeliveryRow): PersonDeliveryContext => ({
  identityProfileId: row.identity_profile_id,
  eoId: row.eo_id,
  memberId: row.member_id,
  displayName: row.resolved_display_name,
  email: row.member_email,
  departmentName: row.department_name,
  projects: {
    ownedCount: toNum(row.owned_projects_count),
    activeOwnedCount: toNum(row.active_owned_projects)
  },
  tasks: {
    totalAssigned: toNum(row.total_assigned_tasks),
    active: toNum(row.active_tasks),
    completed30d: toNum(row.completed_tasks_30d),
    overdue: toNum(row.overdue_tasks),
    avgRpa30d: toNullNum(row.avg_rpa_30d),
    onTimePct30d: toNullNum(row.on_time_pct_30d)
  },
  crm: {
    ownedCompanies: toNum(row.owned_companies_count),
    ownedDeals: toNum(row.owned_deals_count),
    openDealsAmount: toNum(row.open_deals_amount)
  }
})

const buildScopedDeliveryContext = async (
  memberId: string,
  organizationId: string
): Promise<PersonDeliveryContext | null> => {
  const clientIds = await getOrganizationClientIds(organizationId)

  if (clientIds.length === 0) {
    return null
  }

  const rows = await runGreenhousePostgresQuery<DeliveryRow>(
    `SELECT
       base.identity_profile_id,
       base.eo_id,
       base.member_id,
       base.resolved_display_name,
       base.member_email,
       base.department_name,
       COALESCE(proj.owned_count, 0) AS owned_projects_count,
       COALESCE(proj.active_owned_count, 0) AS active_owned_projects,
       COALESCE(tasks.total_assigned, 0) AS total_assigned_tasks,
       COALESCE(tasks.active_tasks, 0) AS active_tasks,
       COALESCE(tasks.completed_30d, 0) AS completed_tasks_30d,
       COALESCE(tasks.overdue_tasks, 0) AS overdue_tasks,
       tasks.avg_rpa_30d,
       tasks.on_time_pct_30d,
       COALESCE(crm_agg.owned_companies, 0) AS owned_companies_count,
       COALESCE(crm_agg.owned_deals, 0) AS owned_deals_count,
       COALESCE(crm_agg.open_deals_amount, 0) AS open_deals_amount
     FROM (
       SELECT
         ip.profile_id AS identity_profile_id,
         ip.public_id AS eo_id,
         m.member_id,
         COALESCE(m.display_name, ip.full_name, 'Sin nombre') AS resolved_display_name,
         m.primary_email AS member_email,
         d.name AS department_name
       FROM greenhouse_core.members m
       LEFT JOIN greenhouse_core.identity_profiles ip
         ON ip.profile_id = m.identity_profile_id
       LEFT JOIN greenhouse_core.departments d
         ON d.department_id = m.department_id
       WHERE m.member_id = $1
       LIMIT 1
     ) base
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS owned_count,
         COUNT(*) FILTER (WHERE p.active AND NOT p.is_deleted)::int AS active_owned_count
       FROM greenhouse_delivery.projects p
       WHERE p.owner_member_id = base.member_id
         AND p.client_id = ANY($2::text[])
     ) proj ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS total_assigned,
         COUNT(*) FILTER (
           WHERE t.task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled')
             AND NOT t.is_deleted
         )::int AS active_tasks,
         COUNT(*) FILTER (
           WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
             AND NOT t.is_deleted
         )::int AS completed_30d,
         COUNT(*) FILTER (
           WHERE t.due_date < CURRENT_DATE
             AND t.task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled')
             AND NOT t.is_deleted
         )::int AS overdue_tasks,
         AVG(t.rpa_value) FILTER (
           WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
             AND t.rpa_value IS NOT NULL
             AND t.rpa_value > 0
             AND NOT t.is_deleted
         ) AS avg_rpa_30d,
         CASE
           WHEN COUNT(*) FILTER (
             WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
               AND t.completed_at IS NOT NULL
               AND t.due_date IS NOT NULL
               AND NOT t.is_deleted
           ) = 0 THEN NULL
           ELSE ROUND(
             100.0 * COUNT(*) FILTER (
               WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
                 AND t.completed_at <= (t.due_date + INTERVAL '1 day')
                 AND NOT t.is_deleted
             )::numeric / NULLIF(COUNT(*) FILTER (
               WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
                 AND t.completed_at IS NOT NULL
                 AND t.due_date IS NOT NULL
                 AND NOT t.is_deleted
             ), 0), 1
           )
         END AS on_time_pct_30d
       FROM greenhouse_delivery.tasks t
       WHERE t.assignee_member_id = base.member_id
         AND t.client_id = ANY($2::text[])
     ) tasks ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         (SELECT COUNT(*)::int
          FROM greenhouse_crm.companies co
          WHERE co.owner_member_id = base.member_id
            AND co.client_id = ANY($2::text[])
            AND NOT co.is_deleted) AS owned_companies,
         COUNT(*)::int AS owned_deals,
         COALESCE(SUM(dl.amount) FILTER (
           WHERE NOT dl.is_closed_won AND NOT dl.is_closed_lost AND NOT dl.is_deleted
         ), 0) AS open_deals_amount
       FROM greenhouse_crm.deals dl
       WHERE dl.owner_member_id = base.member_id
         AND dl.client_id = ANY($2::text[])
         AND NOT dl.is_deleted
     ) crm_agg ON TRUE`,
    [memberId, clientIds]
  )

  return rows[0] ? mapRow(rows[0]) : null
}

// ── Main function ──

export const getPersonDeliveryContext = async (
  identifier: string,
  options: {
    organizationId?: string | null
  } = {}
): Promise<PersonDeliveryContext | null> => {
  const resolved = await resolvePersonIdentifier(identifier)
  const lookupId = resolved?.memberId ?? identifier
  const organizationId = str(options.organizationId)

  if (organizationId) {
    return buildScopedDeliveryContext(lookupId, organizationId)
  }

  const rows = await runGreenhousePostgresQuery<DeliveryRow>(
    `SELECT * FROM greenhouse_serving.person_delivery_360
     WHERE member_id = $1
     LIMIT 1`,
    [lookupId]
  )

  const row = rows[0]

  return row ? mapRow(row) : null
}
