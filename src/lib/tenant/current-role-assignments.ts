import 'server-only'

import { query } from '@/lib/db'
import { isRoleCode } from '@/config/role-codes'
import { deriveRouteGroupsFromRoles } from './role-route-mapping'

/** A scoped role never becomes a global role merely because a serving view flattened it. */
export type CurrentRoleAssignment = {
  role_code: string
  active: boolean
  status: string
  scope_level: string | null
  client_id: string | null
  project_id: string | null
  campaign_id: string | null
  effective_from: Date | string | null
  effective_to: Date | string | null
}

export const isCurrentInternalRoleAssignment = (
  row: CurrentRoleAssignment,
  clientId: string | null,
  now: Date
): boolean => {
  if (!row.active || row.status !== 'active' || !isRoleCode(row.role_code)) return false
  if (row.project_id !== null || row.campaign_id !== null) return false
  if (row.client_id !== null && row.client_id !== clientId) return false
  // The existing role writer uses NULL scope with optional client_id. Unknown explicit scopes deny.
  if (row.scope_level !== null && row.scope_level !== (row.client_id === null ? 'global' : 'client')) return false
  const starts = row.effective_from === null ? Number.NEGATIVE_INFINITY : new Date(row.effective_from).getTime()
  const ends = row.effective_to === null ? Number.POSITIVE_INFINITY : new Date(row.effective_to).getTime()

  return starts <= now.getTime() && ends > now.getTime()
}

export const getCurrentInternalRoleAuthority = async (
  userId: string,
  { clientId = null, now = new Date(), readQuery = query }: {
    clientId?: string | null
    now?: Date
    readQuery?: typeof query
  } = {}
) => {
  const rows = await readQuery<CurrentRoleAssignment>(
    `SELECT a.role_code,a.active,a.status,a.scope_level,a.client_id,a.project_id,a.campaign_id,
            a.effective_from,a.effective_to
       FROM greenhouse_core.user_role_assignments a
       JOIN greenhouse_core.roles r ON r.role_code=a.role_code AND r.tenant_type='efeonce_internal'
      WHERE a.user_id=$1`,
    [userId]
  )

  const roleCodes = [...new Set(rows.filter(row => isCurrentInternalRoleAssignment(row, clientId, now))
    .map(row => row.role_code))].sort()

  return {
    roleCodes,
    // No route-group fallback may resurrect an expired/revoked role for delegated authority.
    routeGroups: roleCodes.length ? deriveRouteGroupsFromRoles(roleCodes, 'efeonce_internal') : []
  }
}
