import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import type { AccountTeamFacet, AccountTeamMember, AccountScope, AccountFacetContext } from '@/types/account-complete-360'

type TeamMemberRow = {
  profile_id: string
  eo_id: string | null
  resolved_display_name: string
  resolved_avatar_url: string | null
  user_id: string | null
  resolved_job_title: string | null
  department_name: string | null
  fte_allocation: string | number | null
  membership_type: string
  is_primary: boolean
}

type CountRow = {
  total: string | number
}

type FteRow = {
  total_fte: string | number | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

export const fetchTeamFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountTeamFacet | null> => {
  const limit = ctx.limit ?? 20
  const offset = ctx.offset ?? 0

  // Build temporal filter clause + params
  const temporalClause = ctx.asOf
    ? 'AND pm.start_date <= $2 AND (pm.end_date IS NULL OR pm.end_date >= $2)'
    : ''

  const baseParams: (string | number)[] = [scope.organizationId]

  if (ctx.asOf) baseParams.push(ctx.asOf)

  // Run count, FTE aggregate, and paginated members in parallel
  const [countRows, fteRows, memberRows] = await Promise.all([
    // Total count (without pagination)
    runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*)::int AS total
       FROM greenhouse_core.person_memberships pm
       WHERE pm.organization_id = $1
         AND pm.active = TRUE
         ${temporalClause}`,
      baseParams
    ),

    // Total FTE (aggregate across all active memberships, no pagination)
    runGreenhousePostgresQuery<FteRow>(
      `SELECT SUM(pm.fte_allocation) AS total_fte
       FROM greenhouse_core.person_memberships pm
       WHERE pm.organization_id = $1
         AND pm.active = TRUE
         ${temporalClause}`,
      baseParams
    ),

    // Paginated members joined with person_360 for avatar/name
    runGreenhousePostgresQuery<TeamMemberRow>(
      `SELECT
        pm.profile_id,
        p360.eo_id,
        p360.resolved_display_name,
        p360.resolved_avatar_url,
        p360.user_id,
        p360.resolved_job_title,
        p360.department_name,
        pm.fte_allocation,
        pm.membership_type,
        pm.is_primary
      FROM greenhouse_core.person_memberships pm
      LEFT JOIN greenhouse_serving.person_360 p360
        ON p360.identity_profile_id = pm.profile_id
      WHERE pm.organization_id = $1
        AND pm.active = TRUE
        ${temporalClause}
      ORDER BY pm.is_primary DESC, p360.resolved_display_name ASC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}`,
      baseParams
    )
  ])

  const totalMembers = toNum(countRows[0]?.total)
  const totalFte = toNum(fteRows[0]?.total_fte)

  const members: AccountTeamMember[] = memberRows.map(row => ({
    profileId: row.profile_id,
    eoId: row.eo_id,
    name: row.resolved_display_name ?? '',
    avatarUrl: resolveAvatarUrl(row.resolved_avatar_url, row.user_id),
    jobTitle: row.resolved_job_title,
    department: row.department_name,
    fteAllocation: row.fte_allocation != null ? toNum(row.fte_allocation) : null,
    membershipType: row.membership_type,
    isPrimary: row.is_primary
  }))

  return {
    totalMembers,
    totalFte,
    members,
    pagination: {
      total: totalMembers,
      limit,
      offset,
      hasMore: offset + limit < totalMembers
    }
  }
}
