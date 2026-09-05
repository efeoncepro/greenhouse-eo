import 'server-only'
import { query } from '@/lib/db'
import { ENTITLEMENT_CAPABILITY_MAP, type EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { can } from '@/lib/entitlements/runtime'
import { getTenantAccessRecordFromPostgresByUserId } from '@/lib/tenant/access'

/** Only catalogued Greenhouse capabilities with current target authority can be delegated here.
 * Provider namespaces require their provider-owned adapter; unknown names fail closed.
 */
export const canDelegateInternalCapability = async (profileId: string, capability: string): Promise<boolean> => {
  const definition = ENTITLEMENT_CAPABILITY_MAP[capability as EntitlementCapabilityKey]

  if (!definition) return false

  const users = await query<{ user_id: string }>(
    `SELECT user_id FROM greenhouse_core.client_users
 WHERE identity_profile_id=$1 AND tenant_type='efeonce_internal' AND active=TRUE AND status='active'`,
    [profileId]
  )

  if (users.length !== 1) return false
  const target = await getTenantAccessRecordFromPostgresByUserId(users[0].user_id)

  if (
    !target ||
    !target.active ||
    target.status !== 'active' ||
    target.identityProfileId !== profileId ||
    target.tenantType !== 'efeonce_internal'
  )
    return false
  const subject = { ...target, memberId: target.memberId ?? undefined }

  // A capability has no action claim: all declared actions must already belong to this person.
  return definition.actions.every(action => can(subject, definition.key, action, definition.defaultScope))
}
