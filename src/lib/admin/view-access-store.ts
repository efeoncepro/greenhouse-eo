import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { GOVERNANCE_SECTIONS, VIEW_REGISTRY, type GovernanceViewRegistryEntry } from '@/lib/admin/view-access-catalog'
import { getAdminAccessOverview } from '@/lib/admin/get-admin-access-overview'

type RoleAssignmentRow = {
  role_code: string
  view_code: string
  granted: boolean
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

export type ViewAccessSource = 'persisted' | 'hardcoded_fallback'

export type PersistedRoleViewAssignmentInput = {
  roleCode: string
  viewCode: string
  granted: boolean
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

const deriveRouteGroupsForSingleRole = (roleCode: string, tenantType: 'client' | 'efeonce_internal') => {
  const routeGroups = new Set<string>()

  if (roleCode.startsWith('efeonce_')) {
    routeGroups.add('internal')
  }

  if (roleCode === 'hr_payroll') {
    routeGroups.add('internal')
    routeGroups.add('hr')
  }

  if (roleCode === 'employee') {
    routeGroups.add('internal')
    routeGroups.add('employee')
  }

  if (roleCode === 'finance_manager') {
    routeGroups.add('internal')
    routeGroups.add('finance')
  }

  if (roleCode === 'efeonce_admin') {
    routeGroups.add('admin')
  }

  if (roleCode === 'collaborator') {
    routeGroups.add('my')
  }

  if (roleCode === 'hr_manager') {
    routeGroups.add('hr')
  }

  if (roleCode === 'finance_analyst' || roleCode === 'finance_admin') {
    routeGroups.add('finance')
  }

  if (roleCode === 'people_viewer') {
    routeGroups.add('people')
  }

  if (roleCode === 'ai_tooling_admin') {
    routeGroups.add('ai_tooling')
  }

  if (roleCode.startsWith('client_')) {
    routeGroups.add('client')
  }

  if (routeGroups.size === 0) {
    routeGroups.add(tenantType === 'efeonce_internal' ? 'internal' : 'client')
  }

  return Array.from(routeGroups)
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

export const getAdminPersistedViewAccessGovernance = async () => {
  const access = await getAdminAccessOverview()

  await syncViewRegistryCatalog()

  const [persistedRows, persistedRegistryRows] = await Promise.all([getPersistedAssignments(), getPersistedViewRegistry()])

  const registryRows = persistedRegistryRows.length > 0
    ? persistedRegistryRows.map<GovernanceViewRegistryEntry>(row => ({
        viewCode: row.view_code,
        section: row.section as GovernanceViewRegistryEntry['section'],
        label: row.label,
        description: row.description || '',
        routeGroup: row.route_group,
        routePath: row.route_path
      }))
    : VIEW_REGISTRY

  const persistedByRole = new Map<string, Map<string, boolean>>()

  for (const row of persistedRows) {
    const current = persistedByRole.get(row.role_code) ?? new Map<string, boolean>()

    current.set(row.view_code, row.granted)
    persistedByRole.set(row.role_code, current)
  }

  const roles = access.roles.map(role => ({
    roleCode: role.roleCode,
    roleName: role.roleName,
    tenantType: role.tenantType,
    isAdmin: role.isAdmin,
    isInternal: role.isInternal,
    routeGroups: role.routeGroups,
    assignedUsers: role.assignedUsers
  }))

  const users = access.users.map(user => ({
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    tenantType: user.tenantType,
    roleCodes: user.roleCodes,
    routeGroups: user.routeGroups
  }))

  const views = registryRows.map(view => ({
    ...view,
    roleAccess: Object.fromEntries(
      roles.map(role => {
        const roleAssignments = persistedByRole.get(role.roleCode)
        const hasPersistedRoleAssignments = Boolean(roleAssignments && roleAssignments.size > 0)

        return [
          role.roleCode,
          hasPersistedRoleAssignments
            ? Boolean(roleAssignments?.get(view.viewCode))
            : roleCanAccessViewFallback(role, view)
        ]
      })
    ),
    roleAccessSource: Object.fromEntries(
      roles.map(role => {
        const roleAssignments = persistedByRole.get(role.roleCode)
        const hasPersistedRoleAssignments = Boolean(roleAssignments && roleAssignments.size > 0)

        return [role.roleCode, hasPersistedRoleAssignments ? 'persisted' : 'hardcoded_fallback']
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
  roleCodes,
  tenantType,
  fallbackRouteGroups
}: {
  roleCodes: string[]
  tenantType: 'client' | 'efeonce_internal'
  fallbackRouteGroups: string[]
}): Promise<ResolvedUserViewAccess> => {
  try {
    const [persistedRows, persistedRegistryRows] = await Promise.all([
      getPersistedAssignments(),
      getPersistedViewRegistry().catch(() => [])
    ])

    const registryRows = persistedRegistryRows.length > 0
      ? persistedRegistryRows.map<GovernanceViewRegistryEntry>(row => ({
          viewCode: row.view_code,
          section: row.section as GovernanceViewRegistryEntry['section'],
          label: row.label,
          description: row.description || '',
          routeGroup: row.route_group,
          routePath: row.route_path
        }))
      : VIEW_REGISTRY

    const persistedByRole = new Map<string, Map<string, boolean>>()

    for (const row of persistedRows) {
      const current = persistedByRole.get(row.role_code) ?? new Map<string, boolean>()

      current.set(row.view_code, row.granted)
      persistedByRole.set(row.role_code, current)
    }

    const authorizedViews = registryRows
      .filter(view =>
        roleCodes.some(roleCode => {
          const roleAssignments = persistedByRole.get(roleCode)
          const hasPersistedRoleAssignments = Boolean(roleAssignments && roleAssignments.size > 0)

          if (hasPersistedRoleAssignments) {
            return Boolean(roleAssignments?.get(view.viewCode))
          }

          return roleCanAccessViewFallback(
            {
              roleCode,
              isAdmin: roleCode === 'efeonce_admin',
              isInternal: deriveRouteGroupsForSingleRole(roleCode, tenantType).includes('internal'),
              routeGroups: deriveRouteGroupsForSingleRole(roleCode, tenantType)
            },
            view
          )
        })
      )
      .map(view => view.viewCode)

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
