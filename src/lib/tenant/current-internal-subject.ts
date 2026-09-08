import 'server-only'

import { query } from '@/lib/db'
import { resolveAuthorizedViewsForUser } from '@/lib/admin/view-access-store'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { getCurrentInternalRoleAuthority } from './current-role-assignments'

/** Strict current subject, independent of session_360's legacy role aggregates and first-row choice. */
export const getCurrentInternalEntitlementSubject = async (
  profileId: string,
  { clientId = null, now = new Date(), readQuery = query }: {
    clientId?: string | null
    now?: Date
    readQuery?: typeof query
  } = {}
): Promise<(TenantEntitlementSubject & { identityProfileId: string; memberId: string }) | null> => {
  const users = await readQuery<{ user_id: string; identity_profile_id: string; member_id: string | null }>(
    `SELECT user_id,identity_profile_id,member_id FROM greenhouse_core.client_users
      WHERE identity_profile_id=$1 AND tenant_type='efeonce_internal' AND active=TRUE AND status='active'`,
    [profileId]
  )

  if (users.length !== 1 || !users[0].member_id) return null
  const user = users[0]
  const roles = await getCurrentInternalRoleAuthority(user.user_id, { clientId, now, readQuery })

  const views = await resolveAuthorizedViewsForUser({
    userId: user.user_id,
    tenantType: 'efeonce_internal',
    roleCodes: roles.roleCodes,
    fallbackRouteGroups: roles.routeGroups,
    strict: true,
    readQuery
  })

  return {
    userId: user.user_id,
    identityProfileId: user.identity_profile_id,
    memberId: user.member_id!,
    tenantType: 'efeonce_internal',
    roleCodes: roles.roleCodes,
    primaryRoleCode: roles.roleCodes[0] ?? 'unknown',
    routeGroups: views.routeGroups,
    authorizedViews: views.authorizedViews
  }
}
