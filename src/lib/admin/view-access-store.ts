import 'server-only'

import { enrichGovernancePreviewUsers } from '@/lib/admin/admin-preview-persons'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { GOVERNANCE_SECTIONS, VIEW_REGISTRY, type GovernanceViewRegistryEntry } from '@/lib/admin/view-access-catalog'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

type RoleAssignmentRow = {
  role_code: string
  view_code: string
  granted: boolean
}

type UserOverrideRow = {
  user_id: string
  view_code: string
  override_type: 'grant' | 'revoke'
  reason: string | null
  expires_at: string | null
}

type ViewRegistryRow = {
  view_code: string
  section: string
  label: string
  description: string | null
  route_group: string
  route_path: string
  display_order: number
  active: boolean
}

type ViewAccessLogRow = {
  action: 'grant_role' | 'revoke_role' | 'grant_user' | 'revoke_user' | 'expire_user'
  target_role: string | null
  target_user: string | null
  view_code: string
  performed_by: string
  reason: string | null
  created_at: string
}

type AccessOverviewUser = Awaited<ReturnType<typeof getAdminAccessOverview>>['users'][number]

export type ViewAccessSource = 'persisted' | 'hardcoded_fallback'

export type PersistedRoleViewAssignmentInput = {
  roleCode: string
  viewCode: string
  granted: boolean
}

export type PersistedUserViewOverrideInput = {
  viewCode: string
  overrideType: 'grant' | 'revoke'
  reason: string | null
  expiresAt: string | null
}

export type ResolvedUserViewAccess = {
  authorizedViews: string[]
  routeGroups: string[]
}

export class ViewAccessStoreError extends Error {
  code: 'SCHEMA_NOT_READY' | 'UNKNOWN'

  constructor(message: string, code: ViewAccessStoreError['code'] = 'UNKNOWN') {
    super(message)
    this.name = 'ViewAccessStoreError'
    this.code = code
  }
}

const missingRelation = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '42P01'
  )
}

const roleCanAccessViewFallback = (
  role: {
    roleCode: string
    isAdmin: boolean
    isInternal: boolean
    routeGroups: string[]
  },
  view: GovernanceViewRegistryEntry
) => {
  if (role.routeGroups.includes(view.routeGroup)) {
    return true
  }

  if (role.isAdmin) {
    return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
  }

  if (view.routeGroup === 'people') {
    return role.roleCode === 'efeonce_operations' || role.roleCode === 'hr_payroll'
  }

  if (view.routeGroup === 'internal') {
    return role.isInternal
  }

  return false
}

import { deriveRouteGroupsForSingleRole } from '@/lib/tenant/role-route-mapping'

const toRegistryRows = (persistedRegistryRows: ViewRegistryRow[]) =>
  persistedRegistryRows.length > 0
    ? persistedRegistryRows.map<GovernanceViewRegistryEntry>(row => ({
        viewCode: row.view_code,
        section: row.section as GovernanceViewRegistryEntry['section'],
        label: row.label,
        description: row.description || '',
        routeGroup: row.route_group,
        routePath: row.route_path
      }))
    : VIEW_REGISTRY

const toPersistedByRole = (persistedRows: RoleAssignmentRow[]) => {
  const persistedByRole = new Map<string, Map<string, boolean>>()

  for (const row of persistedRows) {
    const current = persistedByRole.get(row.role_code) ?? new Map<string, boolean>()

    current.set(row.view_code, row.granted)
    persistedByRole.set(row.role_code, current)
  }

  return persistedByRole
}

const resolveAuthorizedViewsForTargetUser = ({
  user,
  registryRows,
  persistedByRole,
  userOverrides
}: {
  user: AccessOverviewUser
  registryRows: GovernanceViewRegistryEntry[]
  persistedByRole: Map<string, Map<string, boolean>>
  userOverrides: UserOverrideRow[]
}) => {
  const baseAuthorizedViews = registryRows
    .filter(view =>
      user.roleCodes.some(roleCode =>
        resolvePersistedOrFallbackRoleAccess({
          roleAssignments: persistedByRole.get(roleCode),
          role: {
            roleCode,
            isAdmin: roleCode === 'efeonce_admin',
            isInternal: user.routeGroups.includes('internal'),
            routeGroups: deriveRouteGroupsForSingleRole(roleCode, user.tenantType)
          },
          view
        }).granted
      )
    )
    .map(view => view.viewCode)

  return Array.from(
    userOverrides.reduce((current, override) => {
      if (override.override_type === 'grant') {
        current.add(override.view_code)
      } else {
        current.delete(override.view_code)
      }

      return current
    }, new Set(baseAuthorizedViews))
  )
}

const buildViewAccessChangePayload = ({
  user,
  registryRows,
  beforeAuthorizedViews,
  afterAuthorizedViews,
  actorUserId,
  activeOverrides
}: {
  user: AccessOverviewUser
  registryRows: GovernanceViewRegistryEntry[]
  beforeAuthorizedViews: string[]
  afterAuthorizedViews: string[]
  actorUserId: string
  activeOverrides: PersistedUserViewOverrideInput[]
}) => {
  const registryByCode = new Map(registryRows.map(view => [view.viewCode, view]))
  const beforeSet = new Set(beforeAuthorizedViews)
  const afterSet = new Set(afterAuthorizedViews)

  const grantedViews = afterAuthorizedViews
    .filter(viewCode => !beforeSet.has(viewCode))
    .map(viewCode => registryByCode.get(viewCode))
    .filter((view): view is GovernanceViewRegistryEntry => Boolean(view))

  const revokedViews = beforeAuthorizedViews
    .filter(viewCode => !afterSet.has(viewCode))
    .map(viewCode => registryByCode.get(viewCode))
    .filter((view): view is GovernanceViewRegistryEntry => Boolean(view))

  if (grantedViews.length === 0 && revokedViews.length === 0) {
    return null
  }

  return {
    userId: user.userId,
    userName: user.fullName,
    userEmail: user.email,
    tenantType: user.tenantType,
    actorUserId,
    grantedViews: grantedViews.map(view => ({
      viewCode: view.viewCode,
      label: view.label,
      routePath: view.routePath
    })),
    revokedViews: revokedViews.map(view => ({
      viewCode: view.viewCode,
      label: view.label,
      routePath: view.routePath
    })),
    activeOverrides: activeOverrides.map(override => {
      const view = registryByCode.get(override.viewCode)

      return {
        viewCode: override.viewCode,
        label: view?.label ?? override.viewCode,
        routePath: view?.routePath ?? null,
        overrideType: override.overrideType,
        expiresAt: override.expiresAt,
        reason: override.reason
      }
    })
  }
}

const resolvePersistedOrFallbackRoleAccess = ({
  roleAssignments,
  role,
  view
}: {
  roleAssignments: Map<string, boolean> | undefined
  role: {
    roleCode: string
    isAdmin: boolean
    isInternal: boolean
    routeGroups: string[]
  }
  view: GovernanceViewRegistryEntry
}) => {
  if (roleAssignments?.has(view.viewCode)) {
    return {
      granted: Boolean(roleAssignments.get(view.viewCode)),
      source: 'persisted' as ViewAccessSource
    }
  }

  return {
    granted: roleCanAccessViewFallback(role, view),
    source: 'hardcoded_fallback' as ViewAccessSource
  }
}

const getPersistedAssignments = async () => {
  try {
    const rows = await runGreenhousePostgresQuery<RoleAssignmentRow>(
      `
        SELECT
          role_code,
          view_code,
          granted
        FROM greenhouse_core.role_view_assignments
      `
    )

    return rows
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

const getPersistedUserOverrides = async () => {
  try {
    await expireStaleUserOverrides()

    const rows = await runGreenhousePostgresQuery<UserOverrideRow>(
      `
        SELECT
          user_id,
          view_code,
          override_type,
          reason,
          expires_at
        FROM greenhouse_core.user_view_overrides
        WHERE expires_at IS NULL OR expires_at > now()
      `
    )

    return rows
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

const expireStaleUserOverrides = async () => {
  try {
    const expiredRows = await runGreenhousePostgresQuery<UserOverrideRow>(
      `
        SELECT
          user_id,
          view_code,
          override_type,
          reason,
          expires_at
        FROM greenhouse_core.user_view_overrides
        WHERE expires_at IS NOT NULL
          AND expires_at <= now()
        ORDER BY expires_at ASC
      `
    )

    if (expiredRows.length === 0) {
      return { expiredOverrides: 0, notifiedUsers: 0 }
    }

    const affectedUserIds = Array.from(new Set(expiredRows.map(row => row.user_id)))

    const [access, persistedRows, persistedRegistryRows, allPersistedOverrides] = await Promise.all([
      getAdminAccessOverview(),
      getPersistedAssignments(),
      getPersistedViewRegistry().catch(() => []),
      runGreenhousePostgresQuery<UserOverrideRow>(
        `
          SELECT
            user_id,
            view_code,
            override_type,
            reason,
            expires_at
          FROM greenhouse_core.user_view_overrides
          WHERE user_id = ANY($1::text[])
        `,
        [affectedUserIds]
      )
    ])

    const registryRows = toRegistryRows(persistedRegistryRows)
    const persistedByRole = toPersistedByRole(persistedRows)

    const accessChanges = affectedUserIds
      .map(userId => {
        const targetUser = access.users.find(candidate => candidate.userId === userId)

        if (!targetUser) {
          return null
        }

        const beforeUserOverrides = allPersistedOverrides.filter(override => override.user_id === userId)

        const afterUserOverrides = beforeUserOverrides.filter(
          override => !(override.expires_at && new Date(override.expires_at).getTime() <= Date.now())
        )

        return buildViewAccessChangePayload({
          user: targetUser,
          registryRows,
          beforeAuthorizedViews: resolveAuthorizedViewsForTargetUser({
            user: targetUser,
            registryRows,
            persistedByRole,
            userOverrides: beforeUserOverrides
          }),
          afterAuthorizedViews: resolveAuthorizedViewsForTargetUser({
            user: targetUser,
            registryRows,
            persistedByRole,
            userOverrides: afterUserOverrides
          }),
          actorUserId: 'system',
          activeOverrides: afterUserOverrides.map(override => ({
            viewCode: override.view_code,
            overrideType: override.override_type,
            reason: override.reason,
            expiresAt: override.expires_at
          }))
        })
      })
      .filter((payload): payload is NonNullable<typeof payload> => Boolean(payload))

    await withGreenhousePostgresTransaction(async client => {
      for (const override of expiredRows) {
        await client.query(
          `
            DELETE FROM greenhouse_core.user_view_overrides
            WHERE user_id = $1
              AND view_code = $2
              AND expires_at IS NOT NULL
              AND expires_at <= now()
          `,
          [override.user_id, override.view_code]
        )

        await client.query(
          `
            INSERT INTO greenhouse_core.view_access_log (
              action,
              target_user,
              view_code,
              performed_by,
              reason
            )
            VALUES ('expire_user', $1, $2, 'system', $3)
          `,
          [override.user_id, override.view_code, override.reason || 'User override expired automatically']
        )
      }

      for (const payload of accessChanges) {
        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.viewAccess,
            aggregateId: payload.userId,
            eventType: EVENT_TYPES.viewAccessOverrideChanged,
            payload
          },
          client
        )
      }
    })

    return {
      expiredOverrides: expiredRows.length,
      notifiedUsers: accessChanges.length
    }
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

const getRecentViewAccessLog = async () => {
  try {
    const rows = await runGreenhousePostgresQuery<ViewAccessLogRow>(
      `
        SELECT
          action,
          target_role,
          target_user,
          view_code,
          performed_by,
          reason,
          created_at
        FROM greenhouse_core.view_access_log
        ORDER BY created_at DESC
        LIMIT 40
      `
    )

    return rows
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

export const syncViewRegistryCatalog = async (actorUserId = 'system') => {
  try {
    await withGreenhousePostgresTransaction(async client => {
      for (const [index, view] of VIEW_REGISTRY.entries()) {
        await client.query(
          `
            INSERT INTO greenhouse_core.view_registry (
              view_code,
              section,
              label,
              description,
              route_group,
              route_path,
              display_order,
              active,
              updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
            ON CONFLICT (view_code) DO UPDATE SET
              section = EXCLUDED.section,
              label = EXCLUDED.label,
              description = EXCLUDED.description,
              route_group = EXCLUDED.route_group,
              route_path = EXCLUDED.route_path,
              display_order = EXCLUDED.display_order,
              active = TRUE,
              updated_at = now(),
              updated_by = EXCLUDED.updated_by
          `,
          [view.viewCode, view.section, view.label, view.description, view.routeGroup, view.routePath, index, actorUserId]
        )
      }

      await client.query(
        `
          UPDATE greenhouse_core.view_registry
          SET
            active = FALSE,
            updated_at = now(),
            updated_by = $1
          WHERE view_code <> ALL($2::text[])
        `,
        [actorUserId, VIEW_REGISTRY.map(view => view.viewCode)]
      )
    })
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

export const getPersistedViewRegistry = async () => {
  try {
    const rows = await runGreenhousePostgresQuery<ViewRegistryRow>(
      `
        SELECT
          view_code,
          section,
          label,
          description,
          route_group,
          route_path,
          display_order,
          active
        FROM greenhouse_core.view_registry
        WHERE active = TRUE
        ORDER BY section, display_order, label
      `
    )

    return rows
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }
}

export const saveRoleViewAssignments = async ({
  assignments,
  actorUserId
}: {
  assignments: PersistedRoleViewAssignmentInput[]
  actorUserId: string
}) => {
  const dedupedAssignments = Array.from(
    new Map(assignments.map(assignment => [`${assignment.roleCode}::${assignment.viewCode}`, assignment])).values()
  )

  try {
    await syncViewRegistryCatalog(actorUserId)

    await withGreenhousePostgresTransaction(async client => {
      for (const assignment of dedupedAssignments) {
        await client.query(
          `
            INSERT INTO greenhouse_core.role_view_assignments (
              role_code,
              view_code,
              granted,
              granted_by,
              updated_by
            )
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (role_code, view_code) DO UPDATE SET
              granted = EXCLUDED.granted,
              granted_by = EXCLUDED.granted_by,
              granted_at = now(),
              updated_at = now(),
              updated_by = EXCLUDED.updated_by
          `,
          [assignment.roleCode, assignment.viewCode, assignment.granted, actorUserId]
        )

        await client.query(
          `
            INSERT INTO greenhouse_core.view_access_log (
              action,
              target_role,
              view_code,
              performed_by,
              reason
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [assignment.granted ? 'grant_role' : 'revoke_role', assignment.roleCode, assignment.viewCode, actorUserId, 'Admin Center matrix save']
        )
      }
    })
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }

  return {
    savedAssignments: dedupedAssignments.length
  }
}

export const saveUserViewOverrides = async ({
  userId,
  overrides,
  actorUserId
}: {
  userId: string
  overrides: PersistedUserViewOverrideInput[]
  actorUserId: string
}) => {
  const dedupedOverrides = Array.from(
    new Map(overrides.map(override => [override.viewCode, override])).values()
  )

  try {
    await syncViewRegistryCatalog(actorUserId)

    const [access, persistedRows, persistedRegistryRows, persistedUserOverrides] = await Promise.all([
      getAdminAccessOverview(),
      getPersistedAssignments(),
      getPersistedViewRegistry().catch(() => []),
      getPersistedUserOverrides()
    ])

    const targetUser = access.users.find(candidate => candidate.userId === userId) ?? null
    const registryRows = toRegistryRows(persistedRegistryRows)
    const persistedByRole = toPersistedByRole(persistedRows)
    const previousOverridesForUser = persistedUserOverrides.filter(override => override.user_id === userId)

    const beforeAuthorizedViews = targetUser
      ? resolveAuthorizedViewsForTargetUser({
          user: targetUser,
          registryRows,
          persistedByRole,
          userOverrides: previousOverridesForUser
        })
      : []

    const afterAuthorizedViews = targetUser
      ? resolveAuthorizedViewsForTargetUser({
          user: targetUser,
          registryRows,
          persistedByRole,
          userOverrides: dedupedOverrides.map(override => ({
            user_id: userId,
            view_code: override.viewCode,
            override_type: override.overrideType,
            reason: override.reason,
            expires_at: override.expiresAt
          }))
        })
      : []

    const accessChangePayload = targetUser
      ? buildViewAccessChangePayload({
          user: targetUser,
          registryRows,
          beforeAuthorizedViews,
          afterAuthorizedViews,
          actorUserId,
          activeOverrides: dedupedOverrides
        })
      : null

    await withGreenhousePostgresTransaction(async client => {
      await client.query(
        `
          DELETE FROM greenhouse_core.user_view_overrides
          WHERE user_id = $1
        `,
        [userId]
      )

      for (const override of dedupedOverrides) {
        await client.query(
          `
            INSERT INTO greenhouse_core.user_view_overrides (
              user_id,
              view_code,
              override_type,
              reason,
              expires_at,
              granted_by,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, now())
          `,
          [userId, override.viewCode, override.overrideType, override.reason, override.expiresAt, actorUserId]
        )

        await client.query(
          `
            INSERT INTO greenhouse_core.view_access_log (
              action,
              target_user,
              view_code,
              performed_by,
              reason
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [override.overrideType === 'grant' ? 'grant_user' : 'revoke_user', userId, override.viewCode, actorUserId, override.reason || 'Admin Center user override save']
        )
      }

      if (accessChangePayload) {
        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.viewAccess,
            aggregateId: userId,
            eventType: EVENT_TYPES.viewAccessOverrideChanged,
            payload: accessChangePayload
          },
          client
        )
      }
    })
  } catch (error) {
    if (missingRelation(error)) {
      throw new ViewAccessStoreError(
        'View access tables are not provisioned. Run: pnpm setup:postgres:view-access',
        'SCHEMA_NOT_READY'
      )
    }

    throw error
  }

  return {
    savedOverrides: dedupedOverrides.length
  }
}

export const getAdminPersistedViewAccessGovernance = async () => {
  const access = await getAdminAccessOverview()

  await syncViewRegistryCatalog()

  const [persistedRows, persistedRegistryRows, persistedUserOverrides, auditLogRows] = await Promise.all([
    getPersistedAssignments(),
    getPersistedViewRegistry(),
    getPersistedUserOverrides(),
    getRecentViewAccessLog()
  ])

  const registryRows = toRegistryRows(persistedRegistryRows)
  const persistedByRole = toPersistedByRole(persistedRows)

  const roles = access.roles.map(role => ({
    roleCode: role.roleCode,
    roleName: role.roleName,
    tenantType: role.tenantType,
    isAdmin: role.isAdmin,
    isInternal: role.isInternal,
    routeGroups: role.routeGroups,
    assignedUsers: role.assignedUsers
  }))

  const userBaselines = access.users.map(user => ({
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups
  }))

  const users = await enrichGovernancePreviewUsers(userBaselines)

  const views = registryRows.map(view => ({
    ...view,
    roleAccess: Object.fromEntries(
      roles.map(role => {
        const roleAssignments = persistedByRole.get(role.roleCode)

        const resolvedAccess = resolvePersistedOrFallbackRoleAccess({
          roleAssignments,
          role,
          view
        })

        return [role.roleCode, resolvedAccess.granted]
      })
    ),
    roleAccessSource: Object.fromEntries(
      roles.map(role => {
        const roleAssignments = persistedByRole.get(role.roleCode)

        const resolvedAccess = resolvePersistedOrFallbackRoleAccess({
          roleAssignments,
          role,
          view
        })

        return [role.roleCode, resolvedAccess.source]
      })
    ) as Record<string, ViewAccessSource>
  }))

  return {
    totals: {
      registeredViews: views.length,
      configuredRoles: roles.length,
      previewableUsers: users.length,
      sections: GOVERNANCE_SECTIONS.length
    },
    roles,
    users,
    views,
    sections: [...GOVERNANCE_SECTIONS],
    userOverrides: persistedUserOverrides.map(override => ({
      userId: override.user_id,
      viewCode: override.view_code,
      overrideType: override.override_type,
      reason: override.reason,
      expiresAt: override.expires_at
    })),
    auditLog: auditLogRows.map(entry => ({
      action: entry.action,
      targetRole: entry.target_role,
      targetUser: entry.target_user,
      viewCode: entry.view_code,
      performedBy: entry.performed_by,
      reason: entry.reason,
      createdAt: entry.created_at
    })),
    persistence: {
      rolesWithPersistedAssignments: roles.filter(role => {
        const assignments = persistedByRole.get(role.roleCode)

        return Boolean(assignments && assignments.size > 0)
      }).length,
      usesPersistedRegistry: persistedRegistryRows.length > 0
    }
  }
}

export const resolveAuthorizedViewsForUser = async ({
  userId,
  roleCodes,
  tenantType,
  fallbackRouteGroups
}: {
  userId?: string | null
  roleCodes: string[]
  tenantType: 'client' | 'efeonce_internal'
  fallbackRouteGroups: string[]
}): Promise<ResolvedUserViewAccess> => {
  try {
    const [persistedRows, persistedRegistryRows, persistedUserOverrides] = await Promise.all([
      getPersistedAssignments(),
      getPersistedViewRegistry().catch(() => []),
      getPersistedUserOverrides().catch(() => [])
    ])

    const registryRows = toRegistryRows(persistedRegistryRows)
    const persistedByRole = toPersistedByRole(persistedRows)

    const baseAuthorizedViews = registryRows
      .filter(view =>
        roleCodes.some(roleCode => {
          const roleAssignments = persistedByRole.get(roleCode)
          const derivedRouteGroups = deriveRouteGroupsForSingleRole(roleCode, tenantType)

          return resolvePersistedOrFallbackRoleAccess({
            roleAssignments,
            role: {
              roleCode,
              isAdmin: roleCode === 'efeonce_admin',
              isInternal: derivedRouteGroups.includes('internal'),
              routeGroups: derivedRouteGroups
            },
            view
          }).granted
        })
      )
      .map(view => view.viewCode)

    const overridesForUser = userId
      ? persistedUserOverrides.filter(override => override.user_id === userId)
      : []

    const authorizedViews = Array.from(
      overridesForUser.reduce((current, override) => {
        if (override.override_type === 'grant') {
          current.add(override.view_code)
        } else {
          current.delete(override.view_code)
        }

        return current
      }, new Set(baseAuthorizedViews))
    )

    const routeGroups = Array.from(
      new Set(
        registryRows
          .filter(view => authorizedViews.includes(view.viewCode))
          .map(view => view.routeGroup)
      )
    )

    return {
      authorizedViews,
      routeGroups: routeGroups.length > 0 ? routeGroups : fallbackRouteGroups
    }
  } catch (error) {
    if (error instanceof ViewAccessStoreError && error.code === 'SCHEMA_NOT_READY') {
      return {
        authorizedViews: VIEW_REGISTRY.filter(view => fallbackRouteGroups.includes(view.routeGroup)).map(view => view.viewCode),
        routeGroups: fallbackRouteGroups
      }
    }

    throw error
  }
}
