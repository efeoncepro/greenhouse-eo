import 'server-only'

import { ROLE_CODES, isRoleCode } from '@/config/role-codes'
import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

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

/**
 * Check for drift between ROLE_CODES (TypeScript) and greenhouse_core.roles (Postgres).
 * Returns roles present in DB but missing from code, and vice versa.
 * Use in ops health checks or pg:doctor to detect configuration drift.
 */
export const checkRoleCodeDrift = async (): Promise<{
  healthy: boolean
  inDbNotInCode: string[]
  inCodeNotInDb: string[]
}> => {
  const dbRoles = await getAvailableRoles()
  const dbCodes = new Set(dbRoles.map(r => r.roleCode))

  const { ROLE_CODES } = await import('@/config/role-codes')
  const codeCodes = new Set(Object.values(ROLE_CODES))

  const inDbNotInCode = [...dbCodes].filter(code => !codeCodes.has(code as typeof ROLE_CODES[keyof typeof ROLE_CODES]))
  const inCodeNotInDb = [...codeCodes].filter(code => !dbCodes.has(code))

  return {
    healthy: inDbNotInCode.length === 0 && inCodeNotInDb.length === 0,
    inDbNotInCode,
    inCodeNotInDb
  }
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

/**
 * Count active superadmins in the system.
 * Used to prevent revoking the last superadmin.
 */
export const countActiveSuperadmins = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::text AS count
     FROM greenhouse_core.user_role_assignments
     WHERE role_code = $1 AND active = TRUE`,
    [ROLE_CODES.EFEONCE_ADMIN]
  )

  return Number(rows[0]?.count ?? 0)
}

export const updateUserRoles = async (params: {
  userId: string
  roleCodes: string[]
  assignedByUserId: string
}): Promise<UserRoleAssignment[]> => {
  const { userId, roleCodes, assignedByUserId } = params

  // Warn if any role code is not in the typed ROLE_CODES constant.
  const unknownRoles = roleCodes.filter(code => !isRoleCode(code))

  if (unknownRoles.length > 0) {
    console.warn(`[role-management] Assigning unknown role codes not in ROLE_CODES: ${unknownRoles.join(', ')}. Route group derivation may not work for these roles.`)
  }

  // ── Guardrail: only efeonce_admin can assign/revoke efeonce_admin ──
  const currentAssignments = await getUserRoleAssignments(userId)
  const hadAdmin = currentAssignments.some(a => a.roleCode === ROLE_CODES.EFEONCE_ADMIN)
  const willHaveAdmin = roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)

  if (hadAdmin !== willHaveAdmin) {
    // Admin role is being added or removed — verify the actor is also admin
    const actorAssignments = await getUserRoleAssignments(assignedByUserId)
    const actorIsAdmin = actorAssignments.some(a => a.roleCode === ROLE_CODES.EFEONCE_ADMIN)

    if (!actorIsAdmin) {
      throw new Error('Solo un Superadministrador puede asignar o revocar el rol Superadministrador.')
    }
  }

  // ── Guardrail: cannot revoke the last superadmin ──
  if (hadAdmin && !willHaveAdmin) {
    const adminCount = await countActiveSuperadmins()

    if (adminCount <= 1) {
      throw new Error('No se puede revocar el último Superadministrador activo del sistema.')
    }
  }

  // ── Guardrail: efeonce_admin always requires collaborator ──
  if (willHaveAdmin && !roleCodes.includes(ROLE_CODES.COLLABORATOR)) {
    roleCodes.push(ROLE_CODES.COLLABORATOR)
  }

  return withGreenhousePostgresTransaction(async client => {
    // 1. Find roles being revoked (for audit)
    const revokedRoles = currentAssignments
      .filter(a => !roleCodes.includes(a.roleCode))
      .map(a => a.roleCode)

    // 2. Find roles being added (for audit)
    const existingCodes = new Set(currentAssignments.map(a => a.roleCode))
    const addedRoles = roleCodes.filter(code => !existingCodes.has(code))

    // 3. Deactivate roles no longer in the list
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

    // 4. Upsert each role: reactivate existing or insert new
    for (const roleCode of roleCodes) {
      const existing = await client.query(
        `SELECT assignment_id FROM greenhouse_core.user_role_assignments
         WHERE user_id = $1 AND role_code = $2 LIMIT 1`,
        [userId, roleCode]
      )

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE greenhouse_core.user_role_assignments
           SET active = true, status = 'active', assigned_by_user_id = $2, updated_at = NOW()
           WHERE assignment_id = $1`,
          [existing.rows[0].assignment_id, assignedByUserId]
        )
      } else {
        const assignmentId = `ura-${userId}-${roleCode}`

        await client.query(
          `INSERT INTO greenhouse_core.user_role_assignments
             (assignment_id, user_id, role_code, status, active, assigned_by_user_id, created_at, updated_at)
           VALUES ($1, $2, $3, 'active', true, $4, NOW(), NOW())`,
          [assignmentId, userId, roleCode, assignedByUserId]
        )
      }
    }

    // 5. Emit audit events for role changes
    for (const roleCode of addedRoles) {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.roleAssignment,
        aggregateId: `ura-${userId}-${roleCode}`,
        eventType: EVENT_TYPES.roleAssigned,
        payload: { userId, roleCode, assignedByUserId }
      }, client)
    }

    for (const roleCode of revokedRoles) {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.roleAssignment,
        aggregateId: `ura-${userId}-${roleCode}`,
        eventType: EVENT_TYPES.roleRevoked,
        payload: { userId, roleCode, revokedByUserId: assignedByUserId }
      }, client)
    }

    // 6. Return updated assignments
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
