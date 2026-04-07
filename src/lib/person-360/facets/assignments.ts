import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import type { PersonAssignmentsFacet, FacetFetchContext } from '@/types/person-complete-360'

type AssignmentRow = {
  assignment_id: string
  client_id: string
  client_name: string
  space_id: string | null
  fte_allocation: string | number
  hours_per_month: string | number | null
  role_title_override: string | null
  start_date: string | null
  end_date: string | null
  active: boolean
}

type TeamMemberRow = {
  client_id: string
  member_id: string
  display_name: string | null
  avatar_url: string | null
  user_id: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

export const fetchAssignmentsFacet = async (ctx: FacetFetchContext): Promise<PersonAssignmentsFacet | null> => {
  if (!ctx.memberId) return null

  // Fetch assignments, optionally scoped by organization
  const assignmentRows = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT
      a.assignment_id,
      a.client_id,
      COALESCE(c.client_name, a.client_id) AS client_name,
      s.space_id,
      a.fte_allocation::text,
      a.hours_per_month,
      a.role_title_override,
      a.start_date::text,
      a.end_date::text,
      a.active
    FROM greenhouse_core.client_team_assignments a
    LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
    LEFT JOIN greenhouse_core.spaces s ON s.client_id = a.client_id AND s.active = TRUE
    WHERE a.member_id = $1
      AND ($2::text IS NULL OR s.organization_id = $2)
      ${ctx.asOf ? 'AND a.start_date <= $3::date AND (a.end_date IS NULL OR a.end_date >= $3::date)' : ''}
    ORDER BY a.active DESC, a.start_date DESC`,
    ctx.asOf
      ? [ctx.memberId, ctx.organizationId, ctx.asOf]
      : [ctx.memberId, ctx.organizationId]
  )

  if (assignmentRows.length === 0) return []

  // Fetch team members for active assignments
  const activeClientIds = [...new Set(assignmentRows.filter(r => r.active).map(r => r.client_id))]

  let teamByClient = new Map<string, { name: string; avatarUrl: string | null }[]>()

  if (activeClientIds.length > 0) {
    const placeholders = activeClientIds.map((_, i) => `$${i + 1}`).join(', ')

    const teamRows = await runGreenhousePostgresQuery<TeamMemberRow>(
      `SELECT
        a.client_id,
        a.member_id,
        COALESCE(p360.resolved_display_name, m.display_name) AS display_name,
        p360.resolved_avatar_url AS avatar_url,
        cu.user_id
      FROM greenhouse_core.client_team_assignments a
      LEFT JOIN greenhouse_core.members m ON m.member_id = a.member_id
      LEFT JOIN greenhouse_serving.person_360 p360 ON p360.identity_profile_id = m.identity_profile_id
      LEFT JOIN greenhouse_core.client_users cu ON cu.identity_profile_id = m.identity_profile_id AND cu.active = TRUE
      WHERE a.client_id IN (${placeholders})
        AND a.active = TRUE
        AND a.member_id != $${activeClientIds.length + 1}
      ORDER BY a.client_id, COALESCE(p360.resolved_display_name, m.display_name)`,
      [...activeClientIds, ctx.memberId]
    ).catch(() => [] as TeamMemberRow[])

    teamByClient = new Map()

    for (const r of teamRows) {
      const list = teamByClient.get(r.client_id) ?? []

      list.push({
        name: r.display_name || 'Sin nombre',
        avatarUrl: resolveAvatarUrl(r.avatar_url, r.user_id)
      })
      teamByClient.set(r.client_id, list)
    }
  }

  return assignmentRows.map(r => ({
    assignmentId: r.assignment_id,
    clientId: r.client_id,
    clientName: r.client_name?.trim() || r.client_id,
    spaceId: r.space_id,
    fteAllocation: toNum(r.fte_allocation),
    hoursPerMonth: r.hours_per_month != null ? toNum(r.hours_per_month) : null,
    roleTitleOverride: r.role_title_override?.trim() || null,
    startDate: r.start_date ? r.start_date.slice(0, 10) : null,
    endDate: r.end_date ? r.end_date.slice(0, 10) : null,
    active: Boolean(r.active),
    teamMembers: teamByClient.get(r.client_id) ?? []
  }))
}
