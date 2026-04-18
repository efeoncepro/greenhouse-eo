import 'server-only'

import { randomUUID } from 'crypto'

import { sql } from 'kysely'

import { getDb, withTransaction } from '@/lib/db'
import {
  ENTITLEMENT_CAPABILITY_CATALOG,
  ENTITLEMENT_CAPABILITY_MAP,
  ENTITLEMENT_SCOPES,
  type EntitlementAction,
  type EntitlementCapabilityKey,
  type EntitlementScope
} from '@/config/entitlements-catalog'
import { VIEW_ENTITLEMENT_BINDINGS } from '@/lib/admin/entitlement-view-map'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { resolveAuthorizedViewsForUser } from '@/lib/admin/view-access-store'
import { getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlement, TenantEntitlementSubject } from '@/lib/entitlements/types'
import { buildUserPublicId } from '@/lib/ids/greenhouse-ids'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import {
  normalizePortalHomeAlias,
  resolvePortalHomeContract,
  type PortalHomePolicyKey
} from '@/lib/tenant/resolve-portal-home-path'

type EntitlementEffect = 'grant' | 'revoke'
type GovernanceOriginType = 'runtime_base' | 'role_default' | 'user_override'

type RoleDefaultRow = {
  default_id: string
  role_code: string
  capability: string
  action: string
  scope: string
  effect: EntitlementEffect
  reason: string | null
  updated_at: string
}

type UserOverrideRow = {
  override_id: string
  user_id: string
  capability: string
  action: string
  scope: string
  effect: EntitlementEffect
  reason: string
  expires_at: string | null
  updated_at: string
}

type AuditRow = {
  audit_id: string
  change_type: string
  target_role: string | null
  target_user: string | null
  capability: string | null
  action: string | null
  scope: string | null
  effect: EntitlementEffect | null
  policy_key: string | null
  configured_path: string | null
  performed_by: string
  reason: string | null
  created_at: string
}

const PLATFORM_SPACE_ID = '__platform__'
const MAX_AUDIT_ROWS = 40

const SOURCE_LABELS: Record<TenantEntitlement['source'], string> = {
  role: 'Rol base',
  route_group: 'Route group',
  authorized_view: 'Vista derivada',
  scope: 'Scope',
  policy: 'Policy'
}

const POLICY_SORT_ORDER: PortalHomePolicyKey[] = [
  'internal_default',
  'client_default',
  'hr_workspace',
  'finance_workspace',
  'my_workspace'
]

export type EntitlementCatalogEntry = {
  capability: EntitlementCapabilityKey
  module: (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]['module']
  actions: EntitlementAction[]
  defaultScope: EntitlementScope
}

export type RoleEntitlementDefaultInput = {
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
  effect: EntitlementEffect
  reason: string | null
}

export type UserEntitlementOverrideInput = {
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
  effect: EntitlementEffect
  reason: string
  expiresAt: string | null
}

export type EntitlementCapabilitySummary = EntitlementCatalogEntry & {
  linkedViews: number
  roleDefaults: number
  userOverrides: number
}

export type RoleEntitlementDefaultRecord = {
  defaultId: string
  roleCode: string
  roleName: string
  capability: EntitlementCapabilityKey
  module: EntitlementCatalogEntry['module']
  action: EntitlementAction
  scope: EntitlementScope
  effect: EntitlementEffect
  reason: string | null
  updatedAt: string
}

export type UserEntitlementOverrideRecord = {
  overrideId: string
  userId: string
  capability: EntitlementCapabilityKey
  module: EntitlementCatalogEntry['module']
  action: EntitlementAction
  scope: EntitlementScope
  effect: EntitlementEffect
  reason: string
  expiresAt: string | null
  updatedAt: string
}

export type EffectiveEntitlementRecord = {
  module: EntitlementCatalogEntry['module']
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
  originType: GovernanceOriginType
  originLabel: string
  source: TenantEntitlement['source']
  expiresAt: string | null
}

export type StartupPolicySummary = {
  policyKey: PortalHomePolicyKey
  label: string
  defaultPath: string
  usersOnPolicy: number
  usersWithCustomPath: number
}

export type EntitlementGovernanceAuditRecord = {
  auditId: string
  changeType: string
  targetRole: string | null
  targetUser: string | null
  targetUserPublicId: string | null
  capability: EntitlementCapabilityKey | null
  action: EntitlementAction | null
  scope: EntitlementScope | null
  effect: EntitlementEffect | null
  policyKey: PortalHomePolicyKey | null
  configuredPath: string | null
  performedBy: string
  reason: string | null
  createdAt: string
}

export type EntitlementsGovernanceOverview = {
  summary: {
    capabilitiesActive: number
    rolesConfigured: number
    usersWithExceptions: number
    recentChanges: number
  }
  roles: Array<{
    roleCode: string
    roleName: string
  }>
  capabilities: EntitlementCapabilitySummary[]
  roleDefaults: RoleEntitlementDefaultRecord[]
  viewMappings: typeof VIEW_ENTITLEMENT_BINDINGS
  homePolicies: StartupPolicySummary[]
  auditLog: EntitlementGovernanceAuditRecord[]
}

export type UserEntitlementsAccessSummary = {
  userId: string
  summary: {
    modulesActive: number
    effectiveEntitlements: number
    activeOverrides: number
  }
  catalog: EntitlementCatalogEntry[]
  effectiveEntitlements: EffectiveEntitlementRecord[]
  overrides: UserEntitlementOverrideRecord[]
  startupPolicy: {
    policyKey: PortalHomePolicyKey
    label: string
    defaultPath: string
    effectivePath: string
    configuredPath: string | null
    usesGlobalPolicy: boolean
  }
}

const normalizeSpaceId = (spaceId?: string | null) => {
  const normalized = spaceId?.trim()

  return normalized && normalized.length > 0 ? normalized : PLATFORM_SPACE_ID
}

const buildGovernanceRecordId = (prefix: 'ERD' | 'EOV' | 'EAL') => `EO-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`

const entitlementKey = ({
  capability,
  action,
  scope
}: {
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
}) => [capability, action, scope].join('::')

const toCatalogEntry = (capability: EntitlementCapabilityKey): EntitlementCatalogEntry => ({
  capability,
  module: ENTITLEMENT_CAPABILITY_MAP[capability].module,
  actions: [...ENTITLEMENT_CAPABILITY_MAP[capability].actions],
  defaultScope: ENTITLEMENT_CAPABILITY_MAP[capability].defaultScope
})

const assertKnownEntitlement = (
  capability: string,
  action: string,
  scope: string
): {
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope: EntitlementScope
} => {
  if (!(capability in ENTITLEMENT_CAPABILITY_MAP)) {
    throw new Error(`Capability desconocida: ${capability}`)
  }

  const normalizedCapability = capability as EntitlementCapabilityKey
  const allowedActions = [...ENTITLEMENT_CAPABILITY_MAP[normalizedCapability].actions] as EntitlementAction[]

  if (!allowedActions.includes(action as EntitlementAction)) {
    throw new Error(`La capability ${capability} no soporta la acción ${action}`)
  }

  if (!ENTITLEMENT_SCOPES.includes(scope as EntitlementScope)) {
    throw new Error(`Scope inválido: ${scope}`)
  }

  return {
    capability: normalizedCapability,
    action: action as EntitlementAction,
    scope: scope as EntitlementScope
  }
}

const listRoleDefaultRows = async (spaceId: string) => {
  const db = await getDb()

  const result = await sql<RoleDefaultRow>`
    SELECT
      default_id,
      role_code,
      capability,
      action,
      scope,
      effect,
      reason,
      updated_at::text AS updated_at
    FROM greenhouse_core.role_entitlement_defaults
    WHERE space_id = ${spaceId}
    ORDER BY role_code ASC, capability ASC, action ASC, scope ASC
  `.execute(db)

  return result.rows
}

const listUserOverrideRows = async (spaceId: string, userId?: string) => {
  const db = await getDb()

  const userCondition = userId
    ? sql<boolean>`user_id = ${userId}`
    : sql<boolean>`TRUE`

  const result = await sql<UserOverrideRow>`
    SELECT
      override_id,
      user_id,
      capability,
      action,
      scope,
      effect,
      reason,
      expires_at::text AS expires_at,
      updated_at::text AS updated_at
    FROM greenhouse_core.user_entitlement_overrides
    WHERE space_id = ${spaceId}
      AND ${userCondition}
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY user_id ASC, capability ASC, action ASC, scope ASC
  `.execute(db)

  return result.rows
}

const listAuditRows = async (spaceId: string) => {
  const db = await getDb()

  const result = await sql<AuditRow>`
    SELECT
      audit_id,
      change_type,
      target_role,
      target_user,
      capability,
      action,
      scope,
      effect,
      policy_key,
      configured_path,
      performed_by,
      reason,
      created_at::text AS created_at
    FROM greenhouse_core.entitlement_governance_audit_log
    WHERE space_id = ${spaceId}
    ORDER BY created_at DESC
    LIMIT ${MAX_AUDIT_ROWS}
  `.execute(db)

  return result.rows
}

const toRoleDefaultRecord = (
  row: RoleDefaultRow,
  roleNames: Map<string, string>
): RoleEntitlementDefaultRecord => {
  const entitlement = assertKnownEntitlement(row.capability, row.action, row.scope)

  return {
    defaultId: row.default_id,
    roleCode: row.role_code,
    roleName: roleNames.get(row.role_code) ?? row.role_code,
    capability: entitlement.capability,
    module: ENTITLEMENT_CAPABILITY_MAP[entitlement.capability].module,
    action: entitlement.action,
    scope: entitlement.scope,
    effect: row.effect,
    reason: row.reason,
    updatedAt: row.updated_at
  }
}

const toUserOverrideRecord = (row: UserOverrideRow): UserEntitlementOverrideRecord => {
  const entitlement = assertKnownEntitlement(row.capability, row.action, row.scope)

  return {
    overrideId: row.override_id,
    userId: row.user_id,
    capability: entitlement.capability,
    module: ENTITLEMENT_CAPABILITY_MAP[entitlement.capability].module,
    action: entitlement.action,
    scope: entitlement.scope,
    effect: row.effect,
    reason: row.reason,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at
  }
}

const toAuditRecord = (row: AuditRow): EntitlementGovernanceAuditRecord => ({
  auditId: row.audit_id,
  changeType: row.change_type,
  targetRole: row.target_role,
  targetUser: row.target_user,
  targetUserPublicId: row.target_user ? buildUserPublicId({ userId: row.target_user }) : null,
  capability: row.capability ? assertKnownEntitlement(row.capability, row.action || 'read', row.scope || 'own').capability : null,
  action: row.action ? (row.action as EntitlementAction) : null,
  scope: row.scope ? (row.scope as EntitlementScope) : null,
  effect: row.effect,
  policyKey: row.policy_key ? (row.policy_key as PortalHomePolicyKey) : null,
  configuredPath: row.configured_path,
  performedBy: row.performed_by,
  reason: row.reason,
  createdAt: row.created_at
})

const buildPolicySummaries = (users: Awaited<ReturnType<typeof getAdminAccessOverview>>['users']): StartupPolicySummary[] => {
  const summaries = new Map<PortalHomePolicyKey, StartupPolicySummary>()

  for (const key of POLICY_SORT_ORDER) {
    const templateUser =
      key === 'client_default'
        ? { tenantType: 'client' as const, roleCodes: [] as string[], routeGroups: [] as string[] }
        : key === 'internal_default'
          ? { tenantType: 'efeonce_internal' as const, roleCodes: [] as string[], routeGroups: ['internal'] as string[] }
          : key === 'hr_workspace'
            ? { tenantType: 'efeonce_internal' as const, roleCodes: [] as string[], routeGroups: ['hr'] as string[] }
            : key === 'finance_workspace'
              ? { tenantType: 'efeonce_internal' as const, roleCodes: [] as string[], routeGroups: ['finance'] as string[] }
              : { tenantType: 'efeonce_internal' as const, roleCodes: ['collaborator'] as string[], routeGroups: ['my'] as string[] }

    const contract = resolvePortalHomeContract({
      portalHomePath: null,
      tenantType: templateUser.tenantType,
      roleCodes: templateUser.roleCodes,
      routeGroups: templateUser.routeGroups
    })

    summaries.set(key, {
      policyKey: contract.policy.key,
      label: contract.policy.label,
      defaultPath: contract.policy.defaultPath,
      usersOnPolicy: 0,
      usersWithCustomPath: 0
    })
  }

  for (const user of users) {
    const contract = resolvePortalHomeContract({
      portalHomePath: user.portalHomePath || null,
      tenantType: user.tenantType,
      roleCodes: user.roleCodes,
      routeGroups: user.routeGroups
    })

    const current = summaries.get(contract.policy.key)

    if (!current) continue

    current.usersOnPolicy += 1

    if (
      contract.normalizedConfiguredPath &&
      contract.effectivePath === contract.normalizedConfiguredPath &&
      contract.effectivePath !== contract.defaultPath
    ) {
      current.usersWithCustomPath += 1
    }
  }

  return POLICY_SORT_ORDER
    .map(key => summaries.get(key))
    .filter((summary): summary is StartupPolicySummary => Boolean(summary))
}

const buildEntitlementSubject = async ({
  userId,
  tenantType,
  roleCodes,
  routeGroups,
  portalHomePath
}: {
  userId: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
  portalHomePath: string
}): Promise<TenantEntitlementSubject> => {
  const viewAccess = await resolveAuthorizedViewsForUser({
    userId,
    roleCodes,
    tenantType,
    fallbackRouteGroups: routeGroups
  })

  return {
    userId,
    tenantType,
    roleCodes,
    primaryRoleCode: roleCodes[0] || 'unknown',
    routeGroups: viewAccess.routeGroups,
    authorizedViews: viewAccess.authorizedViews,
    portalHomePath
  }
}

const buildEffectiveEntitlements = ({
  baseEntries,
  roleDefaults,
  userOverrides,
  userRoleCodes
}: {
  baseEntries: TenantEntitlement[]
  roleDefaults: RoleEntitlementDefaultRecord[]
  userOverrides: UserEntitlementOverrideRecord[]
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

  for (const row of userOverrides) {
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

export const getEntitlementsGovernanceOverview = async (spaceId?: string | null): Promise<EntitlementsGovernanceOverview> => {
  const effectiveSpaceId = normalizeSpaceId(spaceId)

  const [access, roleDefaultRows, userOverrideRows, auditRows] = await Promise.all([
    getAdminAccessOverview(),
    listRoleDefaultRows(effectiveSpaceId),
    listUserOverrideRows(effectiveSpaceId),
    listAuditRows(effectiveSpaceId)
  ])

  const roleNames = new Map(access.roles.map(role => [role.roleCode, role.roleName]))
  const roleDefaults = roleDefaultRows.map(row => toRoleDefaultRecord(row, roleNames))
  const userOverrides = userOverrideRows.map(toUserOverrideRecord)

  const capabilities = ENTITLEMENT_CAPABILITY_CATALOG.map(definition => ({
    capability: definition.key,
    module: definition.module,
    actions: [...definition.actions],
    defaultScope: definition.defaultScope,
    linkedViews: VIEW_ENTITLEMENT_BINDINGS.filter(binding => binding.capability === definition.key).length,
    roleDefaults: roleDefaults.filter(row => row.capability === definition.key).length,
    userOverrides: userOverrides.filter(row => row.capability === definition.key).length
  }))

  return {
    summary: {
      capabilitiesActive: capabilities.length,
      rolesConfigured: access.roles.length,
      usersWithExceptions: new Set(userOverrides.map(override => override.userId)).size,
      recentChanges: auditRows.length
    },
    roles: access.roles.map(role => ({
      roleCode: role.roleCode,
      roleName: role.roleName
    })),
    capabilities,
    roleDefaults,
    viewMappings: VIEW_ENTITLEMENT_BINDINGS,
    homePolicies: buildPolicySummaries(access.users),
    auditLog: auditRows.map(toAuditRecord)
  }
}

export const getUserEntitlementsAccess = async ({
  userId,
  spaceId
}: {
  userId: string
  spaceId?: string | null
}): Promise<UserEntitlementsAccessSummary> => {
  const effectiveSpaceId = normalizeSpaceId(spaceId)
  const access = await getAdminAccessOverview()
  const user = access.users.find(candidate => candidate.userId === userId)

  if (!user) {
    throw new Error('Usuario no encontrado.')
  }

  const subject = await buildEntitlementSubject({
    userId: user.userId,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups,
    portalHomePath: user.portalHomePath
  })

  const [roleDefaultRows, userOverrideRows] = await Promise.all([
    listRoleDefaultRows(effectiveSpaceId),
    listUserOverrideRows(effectiveSpaceId, user.userId)
  ])

  const roleNames = new Map(access.roles.map(role => [role.roleCode, role.roleName]))
  const roleDefaults = roleDefaultRows.map(row => toRoleDefaultRecord(row, roleNames))
  const userOverrides = userOverrideRows.map(toUserOverrideRecord)
  const baseEntitlements = getTenantEntitlements(subject)

  const effectiveEntitlements = buildEffectiveEntitlements({
    baseEntries: baseEntitlements.entries,
    roleDefaults,
    userOverrides,
    userRoleCodes: user.roleCodes
  })

  const homeContract = resolvePortalHomeContract({
    portalHomePath: user.portalHomePath || null,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups
  })

  return {
    userId: user.userId,
    summary: {
      modulesActive: new Set(effectiveEntitlements.map(entry => entry.module)).size,
      effectiveEntitlements: effectiveEntitlements.length,
      activeOverrides: userOverrides.length
    },
    catalog: ENTITLEMENT_CAPABILITY_CATALOG.map(definition => toCatalogEntry(definition.key)),
    effectiveEntitlements,
    overrides: userOverrides,
    startupPolicy: {
      policyKey: homeContract.policy.key,
      label: homeContract.policy.label,
      defaultPath: homeContract.defaultPath,
      effectivePath: homeContract.effectivePath,
      configuredPath: homeContract.normalizedConfiguredPath,
      usesGlobalPolicy: !homeContract.normalizedConfiguredPath || homeContract.effectivePath === homeContract.defaultPath
    }
  }
}

export const saveRoleEntitlementDefaults = async ({
  roleCode,
  defaults,
  actorUserId,
  spaceId
}: {
  roleCode: string
  defaults: RoleEntitlementDefaultInput[]
  actorUserId: string
  spaceId?: string | null
}) => {
  const effectiveSpaceId = normalizeSpaceId(spaceId)

  const sanitizedDefaults = Array.from(
    new Map(
      defaults.map(defaultRow => {
        const normalized = assertKnownEntitlement(defaultRow.capability, defaultRow.action, defaultRow.scope)

        return [
          entitlementKey(normalized),
          {
            ...normalized,
            effect: defaultRow.effect,
            reason: defaultRow.reason?.trim() || null
          }
        ]
      })
    ).values()
  )

  await withTransaction(async client => {
    await client.query(
      `
        DELETE FROM greenhouse_core.role_entitlement_defaults
        WHERE space_id = $1
          AND role_code = $2
      `,
      [effectiveSpaceId, roleCode]
    )

    for (const defaultRow of sanitizedDefaults) {
      await client.query(
        `
          INSERT INTO greenhouse_core.role_entitlement_defaults (
            default_id,
            space_id,
            role_code,
            capability,
            action,
            scope,
            effect,
            reason,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        `,
        [
          buildGovernanceRecordId('ERD'),
          effectiveSpaceId,
          roleCode,
          defaultRow.capability,
          defaultRow.action,
          defaultRow.scope,
          defaultRow.effect,
          defaultRow.reason,
          actorUserId
        ]
      )

      await client.query(
        `
          INSERT INTO greenhouse_core.entitlement_governance_audit_log (
            audit_id,
            space_id,
            change_type,
            target_role,
            capability,
            action,
            scope,
            effect,
            performed_by,
            reason
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          buildGovernanceRecordId('EAL'),
          effectiveSpaceId,
          defaultRow.effect === 'grant' ? 'role_default_grant' : 'role_default_revoke',
          roleCode,
          defaultRow.capability,
          defaultRow.action,
          defaultRow.scope,
          defaultRow.effect,
          actorUserId,
          defaultRow.reason
        ]
      )
    }

    if (sanitizedDefaults.length === 0) {
      await client.query(
        `
          INSERT INTO greenhouse_core.entitlement_governance_audit_log (
            audit_id,
            space_id,
            change_type,
            target_role,
            performed_by,
            reason
          )
          VALUES ($1, $2, 'role_default_revoke', $3, $4, $5)
        `,
        [buildGovernanceRecordId('EAL'), effectiveSpaceId, roleCode, actorUserId, 'Role defaults reset']
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.entitlementGovernance,
        aggregateId: `${effectiveSpaceId}:${roleCode}`,
        eventType: EVENT_TYPES.entitlementRoleDefaultChanged,
        payload: {
          spaceId: effectiveSpaceId,
          roleCode,
          changedByUserId: actorUserId,
          defaults: sanitizedDefaults
        }
      },
      client
    )
  })

  return { savedDefaults: sanitizedDefaults.length }
}

export const saveUserEntitlementOverrides = async ({
  userId,
  overrides,
  actorUserId,
  spaceId
}: {
  userId: string
  overrides: UserEntitlementOverrideInput[]
  actorUserId: string
  spaceId?: string | null
}) => {
  const effectiveSpaceId = normalizeSpaceId(spaceId)

  const sanitizedOverrides = Array.from(
    new Map(
      overrides.map(override => {
        const normalized = assertKnownEntitlement(override.capability, override.action, override.scope)

        return [
          entitlementKey(normalized),
          {
            ...normalized,
            effect: override.effect,
            reason: override.reason.trim(),
            expiresAt: override.expiresAt?.trim() || null
          }
        ]
      })
    ).values()
  )

  await withTransaction(async client => {
    await client.query(
      `
        DELETE FROM greenhouse_core.user_entitlement_overrides
        WHERE space_id = $1
          AND user_id = $2
      `,
      [effectiveSpaceId, userId]
    )

    for (const override of sanitizedOverrides) {
      await client.query(
        `
          INSERT INTO greenhouse_core.user_entitlement_overrides (
            override_id,
            space_id,
            user_id,
            capability,
            action,
            scope,
            effect,
            reason,
            expires_at,
            granted_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          buildGovernanceRecordId('EOV'),
          effectiveSpaceId,
          userId,
          override.capability,
          override.action,
          override.scope,
          override.effect,
          override.reason,
          override.expiresAt,
          actorUserId
        ]
      )

      await client.query(
        `
          INSERT INTO greenhouse_core.entitlement_governance_audit_log (
            audit_id,
            space_id,
            change_type,
            target_user,
            capability,
            action,
            scope,
            effect,
            performed_by,
            reason
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          buildGovernanceRecordId('EAL'),
          effectiveSpaceId,
          override.effect === 'grant' ? 'user_override_grant' : 'user_override_revoke',
          userId,
          override.capability,
          override.action,
          override.scope,
          override.effect,
          actorUserId,
          override.reason
        ]
      )
    }

    if (sanitizedOverrides.length === 0) {
      await client.query(
        `
          INSERT INTO greenhouse_core.entitlement_governance_audit_log (
            audit_id,
            space_id,
            change_type,
            target_user,
            performed_by,
            reason
          )
          VALUES ($1, $2, 'user_override_revoke', $3, $4, $5)
        `,
        [buildGovernanceRecordId('EAL'), effectiveSpaceId, userId, actorUserId, 'User entitlement overrides reset']
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.entitlementGovernance,
        aggregateId: `${effectiveSpaceId}:${userId}`,
        eventType: EVENT_TYPES.entitlementUserOverrideChanged,
        payload: {
          spaceId: effectiveSpaceId,
          userId,
          changedByUserId: actorUserId,
          overrides: sanitizedOverrides
        }
      },
      client
    )
  })

  return { savedOverrides: sanitizedOverrides.length }
}

export const updateUserStartupPolicy = async ({
  userId,
  portalHomePath,
  actorUserId,
  reason,
  spaceId
}: {
  userId: string
  portalHomePath: string | null
  actorUserId: string
  reason: string
  spaceId?: string | null
}) => {
  const effectiveSpaceId = normalizeSpaceId(spaceId)
  const normalizedPath = normalizePortalHomeAlias(portalHomePath)
  const configuredPath = normalizedPath || null
  const access = await getAdminAccessOverview()
  const user = access.users.find(candidate => candidate.userId === userId)

  if (!user) {
    throw new Error('Usuario no encontrado.')
  }

  const contract = resolvePortalHomeContract({
    portalHomePath: configuredPath,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups
  })

  await withTransaction(async client => {
    await client.query(
      `
        UPDATE greenhouse_core.client_users
        SET
          default_portal_home_path = $2,
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId, configuredPath]
    )

    await client.query(
      `
        INSERT INTO greenhouse_core.entitlement_governance_audit_log (
          audit_id,
          space_id,
          change_type,
          target_user,
          policy_key,
          configured_path,
          performed_by,
          reason
        )
        VALUES ($1, $2, 'startup_policy_update', $3, $4, $5, $6, $7)
      `,
      [buildGovernanceRecordId('EAL'), effectiveSpaceId, userId, contract.policy.key, configuredPath, actorUserId, reason]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.entitlementGovernance,
        aggregateId: `${effectiveSpaceId}:${userId}:startup`,
        eventType: EVENT_TYPES.startupPolicyChanged,
        payload: {
          spaceId: effectiveSpaceId,
          userId,
          changedByUserId: actorUserId,
          policyKey: contract.policy.key,
          configuredPath,
          effectivePath: contract.effectivePath
        }
      },
      client
    )
  })

  return {
    policyKey: contract.policy.key,
    effectivePath: contract.effectivePath,
    configuredPath
  }
}
