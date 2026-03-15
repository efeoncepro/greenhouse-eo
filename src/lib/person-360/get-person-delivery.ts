import 'server-only'

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

// ── Row type ──

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
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  return Number.isFinite(n) ? n : null
}

// ── Main function ──

export const getPersonDeliveryContext = async (identifier: string): Promise<PersonDeliveryContext | null> => {
  const resolved = await resolvePersonIdentifier(identifier)
  const lookupId = resolved?.memberId ?? identifier

  const rows = await runGreenhousePostgresQuery<DeliveryRow>(
    `SELECT * FROM greenhouse_serving.person_delivery_360
     WHERE member_id = $1
     LIMIT 1`,
    [lookupId]
  )

  const row = rows[0]

  if (!row) return null

  return {
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
  }
}
