import 'server-only'

import { query } from '@/lib/db'
import {
  ENTITLEMENT_CAPABILITY_MAP, ENTITLEMENT_SCOPES,
  type EntitlementCapabilityKey, type EntitlementAction, type EntitlementScope
} from '@/config/entitlements-catalog'
import type { TenantEntitlementSubject } from './types'
import { getTenantEntitlements } from './runtime'
import { buildEffectiveEntitlements, type EffectiveRoleDefault, type EffectiveUserOverride } from './effective'

export const PLATFORM_ENTITLEMENT_SPACE_ID = '__platform__'

type EntitlementRow = {
  capability: string
  action: string
  scope: string
  effect: 'grant' | 'revoke'
}

const entryFromRow = (row: EntitlementRow) => {
  const definition = Object.hasOwn(ENTITLEMENT_CAPABILITY_MAP, row.capability)
    ? ENTITLEMENT_CAPABILITY_MAP[row.capability as EntitlementCapabilityKey] : undefined

  if (!definition || !(definition.actions as readonly string[]).includes(row.action) ||
    !(ENTITLEMENT_SCOPES as readonly string[]).includes(row.scope) || !['grant', 'revoke'].includes(row.effect)) {
    throw new Error('Invalid effective entitlement contract')
  }

  return {
    module: definition.module, capability: definition.key,
    action: row.action as EntitlementAction, scope: row.scope as EntitlementScope, effect: row.effect
  }
}

/** Batch facts only for the current actor and requested spaces; the merger remains canonical. */
export const readEffectiveEntitlementFacts = async (
  input: { userId: string; roleCodes: string[]; spaceIds: string[] },
  { readQuery = query }: { readQuery?: typeof query } = {}
) => {
  const roleRows = await readQuery<EntitlementRow & { role_code: string; space_id: string }>(
    `SELECT space_id,role_code,capability,action,scope,effect FROM greenhouse_core.role_entitlement_defaults
      WHERE space_id=ANY($1::text[]) AND role_code=ANY($2::text[])
      ORDER BY role_code,capability,action,scope`, [input.spaceIds, input.roleCodes]
  )

  const overrideRows = await readQuery<EntitlementRow & { space_id: string; expires_at: string | null; approval_status: 'approved' }>(
    `SELECT space_id,capability,action,scope,effect,expires_at::text,approval_status
       FROM greenhouse_core.user_entitlement_overrides
      WHERE space_id=ANY($1::text[]) AND user_id=$2 AND approval_status='approved'
        AND (expires_at IS NULL OR expires_at>NOW())
      ORDER BY capability,action,scope`, [input.spaceIds, input.userId]
  )

  return (subject: TenantEntitlementSubject, spaceId = PLATFORM_ENTITLEMENT_SPACE_ID) => {
    if (subject.userId !== input.userId || !input.spaceIds.includes(spaceId) ||
        subject.roleCodes.some(role => !input.roleCodes.includes(role))) throw new Error('entitlement_facts_context_mismatch')

    const roleDefaults: EffectiveRoleDefault[] = roleRows.filter(row => row.space_id === spaceId).map(row => ({
      ...entryFromRow(row), roleCode: row.role_code, roleName: row.role_code
    }))

    const userOverrides: EffectiveUserOverride[] = overrideRows.filter(row => row.space_id === spaceId).map(row => ({
      ...entryFromRow(row), approvalStatus: row.approval_status, expiresAt: row.expires_at
    }))

    return buildEffectiveEntitlements({
      baseEntries: getTenantEntitlements(subject).entries, roleDefaults, userOverrides, userRoleCodes: subject.roleCodes
    })
  }
}

/** No overview scan, cross-request cache, cleanup or authorization fallback. */
export const readEffectiveEntitlements = async (
  subject: TenantEntitlementSubject,
  { spaceId = PLATFORM_ENTITLEMENT_SPACE_ID, readQuery = query }: { spaceId?: string; readQuery?: typeof query } = {}
) => (await readEffectiveEntitlementFacts({ userId: subject.userId, roleCodes: subject.roleCodes, spaceIds: [spaceId] }, { readQuery }))(subject, spaceId)
