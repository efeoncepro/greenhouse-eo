import 'server-only'

import type { TenantEntitlement } from './types'

/** Shared precedence for the governance presentation and current delegated authority.
 * Revocation removes the exact capability/action/scope key, as in Admin Center;
 * it does not manufacture a wildcard deny that the canonical model does not define.
 */
export type EffectiveEntitlementRecord = TenantEntitlement & {
  originType: 'runtime_base' | 'role_default' | 'user_override'
  originLabel: string
  expiresAt: string | null
}

type EntitlementEntry = Omit<TenantEntitlement, 'source'>
export type EffectiveRoleDefault = EntitlementEntry & {
  roleCode: string
  roleName: string
  effect: 'grant' | 'revoke'
}
export type EffectiveUserOverride = EntitlementEntry & {
  effect: 'grant' | 'revoke'
  approvalStatus: 'approved' | 'pending_approval' | 'rejected'
  expiresAt: string | null
}

const SOURCE_LABELS: Record<TenantEntitlement['source'], string> = {
  role: 'Rol base',
  route_group: 'Route group',
  authorized_view: 'Vista derivada',
  scope: 'Scope',
  policy: 'Policy'
}


const entitlementKey = ({
  capability,
  action,
  scope
}: {
  capability: TenantEntitlement['capability']
  action: TenantEntitlement['action']
  scope: TenantEntitlement['scope']
}) => [capability, action, scope].join('::')


export const buildEffectiveEntitlements = ({
  baseEntries,
  roleDefaults,
  userOverrides,
  userRoleCodes
}: {
  baseEntries: TenantEntitlement[]
  roleDefaults: EffectiveRoleDefault[]
  userOverrides: EffectiveUserOverride[]
  userRoleCodes: string[]
}) => {
  const registry = new Map<string, EffectiveEntitlementRecord>()

  for (const entry of baseEntries) {
    registry.set(
      entitlementKey(entry),
      {
        module: entry.module,
        capability: entry.capability,
        action: entry.action,
        scope: entry.scope,
        originType: 'runtime_base',
        originLabel: SOURCE_LABELS[entry.source],
        source: entry.source,
        expiresAt: null
      }
    )
  }

  for (const row of roleDefaults.filter(candidate => userRoleCodes.includes(candidate.roleCode))) {
    const key = entitlementKey(row)

    if (row.effect === 'grant') {
      registry.set(key, {
        module: row.module,
        capability: row.capability,
        action: row.action,
        scope: row.scope,
        originType: 'role_default',
        originLabel: `Default ${row.roleName}`,
        source: 'role',
        expiresAt: null
      })
    } else {
      registry.delete(key)
    }
  }

  for (const row of userOverrides.filter(override => override.approvalStatus === 'approved')) {
    const key = entitlementKey(row)

    if (row.effect === 'grant') {
      registry.set(key, {
        module: row.module,
        capability: row.capability,
        action: row.action,
        scope: row.scope,
        originType: 'user_override',
        originLabel: 'Excepción manual',
        source: 'policy',
        expiresAt: row.expiresAt
      })
    } else {
      registry.delete(key)
    }
  }

  return Array.from(registry.values()).sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module)
    if (a.capability !== b.capability) return a.capability.localeCompare(b.capability)
    if (a.action !== b.action) return a.action.localeCompare(b.action)

    return a.scope.localeCompare(b.scope)
  })
}
