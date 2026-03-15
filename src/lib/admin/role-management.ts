import 'server-only'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'

export interface RoleCatalogEntry {
  roleCode: string
  roleName: string
  roleFamily: string | null
  description: string | null
  tenantType: string | null
  isAdmin: boolean
  isInternal: boolean
  routeGroupScope: string[]
}

export interface UserRoleAssignment {
  assignmentId: string
  roleCode: string
  roleName: string
  roleFamily: string | null
  active: boolean
  routeGroupScope: string[]
}

export interface UserRoleState {
  userId: string
  currentAssignments: UserRoleAssignment[]
  availableRoles: RoleCatalogEntry[]
}

type RoleCatalogRow = {
  role_code: string
  role_name: string
  role_family: string | null
  description: string | null
  tenant_type: string | null
  is_admin: boolean
  is_internal: boolean
  route_group_scope: string[]
}

type AssignmentRow = {
  assignment_id: string
  role_code: string
  role_name: string
  role_family: string | null
  active: boolean
  route_group_scope: string[]
}

const normalizeRoleCatalog = (row: RoleCatalogRow): RoleCatalogEntry => ({
  roleCode: row.role_code,
  roleName: row.role_name,
  roleFamily: row.role_family ?? null,
  description: row.description ?? null,
  tenantType: row.tenant_type ?? null,
  isAdmin: row.is_admin ?? false,
  isInternal: row.is_internal ?? false,
  routeGroupScope: row.route_group_scope ?? []
})

const normalizeAssignment = (row: AssignmentRow): UserRoleAssignment => ({
  assignmentId: row.assignment_id,
  roleCode: row.role_code,
  roleName: row.role_name,
  roleFamily: row.role_family ?? null,
  active: row.active ?? true,
  routeGroupScope: row.route_group_scope ?? []
})

export const getAvailableRoles = async (): Promise<RoleCatalogEntry[]> => {
  const rows = await runGreenhousePostgresQuery<RoleCatalogRow>(
    `SELECT role_code, role_name, role_family, description, tenant_type,
            is_admin, is_internal, route_group_scope
     FROM greenhouse_core.roles
     ORDER BY role_name ASC`
  )

  return rows.map(normalizeRoleCatalog)
}

export const getUserRoleAssignments = async (userId: string): Promise<UserRoleAssignment[]> => {
  const rows = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT ura.assignment_id, ura.role_code, r.role_name, r.role_family,
            ura.active, r.route_group_scope
     FROM greenhouse_core.user_role_assignments AS ura
     INNER JOIN greenhouse_core.roles AS r ON r.role_code = ura.role_code
     WHERE ura.user_id = $1 AND ura.active = true
     ORDER BY r.role_name ASC`,
    [userId]
  )

  return rows.map(normalizeAssignment)
}

export const getUserRoleState = async (userId: string): Promise<UserRoleState> => {
  const [currentAssignments, availableRoles] = await Promise.all([
    getUserRoleAssignments(userId),
    getAvailableRoles()
  ])

  return { userId, currentAssignments, availableRoles }
}

export const updateUserRoles = async (params: {
  userId: string
  roleCodes: string[]
  assignedByUserId: string
}): Promise<UserRoleAssignment[]> => {
  const { userId, roleCodes } = params

  return withGreenhousePostgresTransaction(async client => {
    // 1. Deactivate roles no longer in the list
    if (roleCodes.length > 0) {
      await client.query(
        `UPDATE greenhouse_core.user_role_assignments
         SET active = false, status = 'revoked', updated_at = NOW()
         WHERE user_id = $1 AND active = true AND role_code != ALL($2::text[])`,
        [userId, roleCodes]
      )
    } else {
      await client.query(
        `UPDATE greenhouse_core.user_role_assignments
         SET active = false, status = 'revoked', updated_at = NOW()
         WHERE user_id = $1 AND active = true`,
        [userId]
      )
    }

    // 2. Upsert each role: reactivate existing or insert new
    for (const roleCode of roleCodes) {
      const existing = await client.query(
        `SELECT assignment_id FROM greenhouse_core.user_role_assignments
         WHERE user_id = $1 AND role_code = $2 LIMIT 1`,
        [userId, roleCode]
      )

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE greenhouse_core.user_role_assignments
           SET active = true, status = 'active', updated_at = NOW()
           WHERE assignment_id = $1`,
          [existing.rows[0].assignment_id]
        )
      } else {
        const assignmentId = `ura-${userId}-${roleCode}`

        await client.query(
          `INSERT INTO greenhouse_core.user_role_assignments
             (assignment_id, user_id, role_code, status, active, created_at, updated_at)
           VALUES ($1, $2, $3, 'active', true, NOW(), NOW())`,
          [assignmentId, userId, roleCode]
        )
      }
    }

    // 3. Return updated assignments
    const result = await client.query<AssignmentRow>(
      `SELECT ura.assignment_id, ura.role_code, r.role_name, r.role_family,
              ura.active, r.route_group_scope
       FROM greenhouse_core.user_role_assignments AS ura
       INNER JOIN greenhouse_core.roles AS r ON r.role_code = ura.role_code
       WHERE ura.user_id = $1 AND ura.active = true
       ORDER BY r.role_name ASC`,
      [userId]
    )

    return result.rows.map(normalizeAssignment)
  })
}
