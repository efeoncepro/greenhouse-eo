import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import type {
  PermissionSetSummary,
  PermissionSetDetail,
  PermissionSetUserAssignment,
  UserPermissionSetInfo
} from '@/types/permission-sets'

// ── Row types ──

type PermissionSetRow = {
  set_id: string
  set_name: string
  description: string | null
  section: string | null
  view_codes: string[]
  is_system: boolean
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  user_count?: string
}

type AssignmentRow = {
  assignment_id: string
  user_id: string
  full_name: string | null
  email: string | null
  active: boolean
  expires_at: string | null
  reason: string | null
  assigned_by_user_id: string | null
  created_at: string
}

type UserSetRow = {
  set_id: string
  set_name: string
  description: string | null
  section: string | null
  view_codes: string[]
  is_system: boolean
  active: boolean
  assignment_id: string
  expires_at: string | null
  reason: string | null
  assigned_by_user_id: string | null
  assigned_at: string
}

// ── Error class ──

export class PermissionSetError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'PermissionSetError'
    this.statusCode = statusCode
  }
}

// ── Normalizers ──

const normalizeSetSummary = (row: PermissionSetRow): PermissionSetSummary => ({
  setId: row.set_id,
  setName: row.set_name,
  description: row.description,
  section: row.section,
  viewCodes: row.view_codes || [],
  isSystem: row.is_system,
  active: row.active,
  userCount: Number(row.user_count ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const normalizeAssignment = (row: AssignmentRow): PermissionSetUserAssignment => ({
  assignmentId: row.assignment_id,
  userId: row.user_id,
  fullName: row.full_name,
  email: row.email,
  active: row.active,
  expiresAt: row.expires_at,
  reason: row.reason,
  assignedByUserId: row.assigned_by_user_id,
  createdAt: row.created_at
})

// ── CRUD operations ──

export const listPermissionSets = async (): Promise<PermissionSetSummary[]> => {
  const rows = await runGreenhousePostgresQuery<PermissionSetRow>(
    `
    SELECT
      ps.*,
      COALESCE(uc.user_count, 0) AS user_count
    FROM greenhouse_core.permission_sets ps
    LEFT JOIN (
      SELECT set_id, COUNT(*) AS user_count
      FROM greenhouse_core.user_permission_set_assignments
      WHERE active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY set_id
    ) uc ON uc.set_id = ps.set_id
    WHERE ps.active = true
    ORDER BY ps.is_system DESC, ps.section, ps.set_name
    `
  )

  return rows.map(normalizeSetSummary)
}

export const getPermissionSet = async (setId: string): Promise<PermissionSetDetail | null> => {
  const rows = await runGreenhousePostgresQuery<PermissionSetRow>(
    `
    SELECT
      ps.*,
      COALESCE(uc.user_count, 0) AS user_count
    FROM greenhouse_core.permission_sets ps
    LEFT JOIN (
      SELECT set_id, COUNT(*) AS user_count
      FROM greenhouse_core.user_permission_set_assignments
      WHERE active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY set_id
    ) uc ON uc.set_id = ps.set_id
    WHERE ps.set_id = $1 AND ps.active = true
    `,
    [setId]
  )

  if (rows.length === 0) return null

  const row = rows[0]

  const assignmentRows = await runGreenhousePostgresQuery<AssignmentRow>(
    `
    SELECT
      upsa.assignment_id,
      upsa.user_id,
      cu.full_name,
      cu.email,
      upsa.active,
      upsa.expires_at,
      upsa.reason,
      upsa.assigned_by_user_id,
      upsa.created_at
    FROM greenhouse_core.user_permission_set_assignments upsa
    INNER JOIN greenhouse_core.client_users cu ON cu.user_id = upsa.user_id
    WHERE upsa.set_id = $1
      AND upsa.active = true
      AND (upsa.expires_at IS NULL OR upsa.expires_at > NOW())
    ORDER BY cu.full_name ASC
    `,
    [setId]
  )

  return {
    ...normalizeSetSummary(row),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    users: assignmentRows.map(normalizeAssignment)
  }
}

export const createPermissionSet = async ({
  setId,
  name,
  description,
  section,
  viewCodes,
  createdBy
}: {
  setId: string
  name: string
  description?: string
  section?: string
  viewCodes: string[]
  createdBy: string
}): Promise<string> => {
  await runGreenhousePostgresQuery(
    `
    INSERT INTO greenhouse_core.permission_sets
      (set_id, set_name, description, section, view_codes, is_system, active, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, false, true, $6, NOW(), NOW())
    `,
    [setId, name, description || null, section || null, viewCodes, createdBy]
  )

  await logViewAccessAction({
    action: 'create_set',
    viewCode: setId,
    performedBy: createdBy,
    reason: `Permission Set creado: ${name}`
  })

  return setId
}

export const updatePermissionSet = async (
  setId: string,
  {
    name,
    description,
    section,
    viewCodes,
    updatedBy
  }: {
    name?: string
    description?: string
    section?: string
    viewCodes?: string[]
    updatedBy: string
  }
): Promise<void> => {
  const set = await getPermissionSetRaw(setId)

  if (!set) throw new PermissionSetError('Permission Set no encontrado.', 404)

  const updates: string[] = ['updated_at = NOW()', 'updated_by = $2']
  const params: unknown[] = [setId, updatedBy]
  let paramIdx = 3

  if (name !== undefined) {
    updates.push(`set_name = $${paramIdx}`)
    params.push(name)
    paramIdx++
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIdx}`)
    params.push(description)
    paramIdx++
  }

  if (section !== undefined) {
    updates.push(`section = $${paramIdx}`)
    params.push(section)
    paramIdx++
  }

  if (viewCodes !== undefined) {
    updates.push(`view_codes = $${paramIdx}`)
    params.push(viewCodes)
    paramIdx++
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.permission_sets SET ${updates.join(', ')} WHERE set_id = $1 AND active = true`,
    params
  )

  await logViewAccessAction({
    action: 'update_set',
    viewCode: setId,
    performedBy: updatedBy,
    reason: `Permission Set actualizado: ${name || set.set_name}`
  })
}

export const deletePermissionSet = async (setId: string, deletedBy: string): Promise<void> => {
  const set = await getPermissionSetRaw(setId)

  if (!set) throw new PermissionSetError('Permission Set no encontrado.', 404)
  if (set.is_system) throw new PermissionSetError('No se puede eliminar un Permission Set de sistema.', 403)

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `UPDATE greenhouse_core.user_permission_set_assignments SET active = false, updated_at = NOW() WHERE set_id = $1 AND active = true`,
      [setId]
    )

    await client.query(
      `UPDATE greenhouse_core.permission_sets SET active = false, updated_at = NOW(), updated_by = $2 WHERE set_id = $1`,
      [setId, deletedBy]
    )

    await client.query(
      `INSERT INTO greenhouse_core.view_access_log (action, view_code, performed_by, reason)
       VALUES ('delete_set', $1, $2, $3)`,
      [setId, deletedBy, `Permission Set eliminado: ${set.set_name}`]
    )
  })
}

// ── User assignment operations ──

export const getSetUsers = async (setId: string): Promise<PermissionSetUserAssignment[]> => {
  const rows = await runGreenhousePostgresQuery<AssignmentRow>(
    `
    SELECT
      upsa.assignment_id,
      upsa.user_id,
      cu.full_name,
      cu.email,
      upsa.active,
      upsa.expires_at,
      upsa.reason,
      upsa.assigned_by_user_id,
      upsa.created_at
    FROM greenhouse_core.user_permission_set_assignments upsa
    INNER JOIN greenhouse_core.client_users cu ON cu.user_id = upsa.user_id
    WHERE upsa.set_id = $1
      AND upsa.active = true
      AND (upsa.expires_at IS NULL OR upsa.expires_at > NOW())
    ORDER BY cu.full_name ASC
    `,
    [setId]
  )

  return rows.map(normalizeAssignment)
}

export const assignUsersToSet = async (
  setId: string,
  userIds: string[],
  {
    assignedBy,
    reason,
    expiresAt
  }: {
    assignedBy: string
    reason?: string
    expiresAt?: string | null
  }
): Promise<number> => {
  const set = await getPermissionSetRaw(setId)

  if (!set) throw new PermissionSetError('Permission Set no encontrado.', 404)

  let assignedCount = 0

  await withGreenhousePostgresTransaction(async client => {
    for (const userId of userIds) {
      const assignmentId = `upsa-${userId}-${setId}`

      await client.query(
        `
        INSERT INTO greenhouse_core.user_permission_set_assignments
          (assignment_id, user_id, set_id, active, expires_at, reason, assigned_by_user_id, created_at, updated_at)
        VALUES ($1, $2, $3, true, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id, set_id)
        DO UPDATE SET active = true, expires_at = EXCLUDED.expires_at, reason = EXCLUDED.reason,
                      assigned_by_user_id = EXCLUDED.assigned_by_user_id, updated_at = NOW()
        `,
        [assignmentId, userId, setId, expiresAt || null, reason || null, assignedBy]
      )

      await client.query(
        `INSERT INTO greenhouse_core.view_access_log (action, target_user, view_code, performed_by, reason)
         VALUES ('grant_set', $1, $2, $3, $4)`,
        [userId, setId, assignedBy, reason || `Asignado a Permission Set: ${set.set_name}`]
      )

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.permissionSet,
          aggregateId: `upsa-${userId}-${setId}`,
          eventType: EVENT_TYPES.viewAccessSetAssigned,
          payload: { userId, setId, setName: set.set_name, assignedByUserId: assignedBy }
        },
        client
      )

      assignedCount++
    }
  })

  return assignedCount
}

export const removeUserFromSet = async (
  setId: string,
  userId: string,
  removedBy: string
): Promise<void> => {
  const set = await getPermissionSetRaw(setId)

  if (!set) throw new PermissionSetError('Permission Set no encontrado.', 404)

  await withGreenhousePostgresTransaction(async client => {
    const result = await client.query(
      `UPDATE greenhouse_core.user_permission_set_assignments
       SET active = false, updated_at = NOW()
       WHERE set_id = $1 AND user_id = $2 AND active = true`,
      [setId, userId]
    )

    if ((result as { rowCount?: number }).rowCount === 0) {
      throw new PermissionSetError('El usuario no tiene esta asignación activa.', 404)
    }

    await client.query(
      `INSERT INTO greenhouse_core.view_access_log (action, target_user, view_code, performed_by, reason)
       VALUES ('revoke_set', $1, $2, $3, $4)`,
      [userId, setId, removedBy, `Revocado de Permission Set: ${set.set_name}`]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.permissionSet,
        aggregateId: `upsa-${userId}-${setId}`,
        eventType: EVENT_TYPES.viewAccessSetRevoked,
        payload: { userId, setId, setName: set.set_name, revokedByUserId: removedBy }
      },
      client
    )
  })
}

// ── Resolution ──

export const getUserPermissionSets = async (userId: string): Promise<UserPermissionSetInfo[]> => {
  const rows = await runGreenhousePostgresQuery<UserSetRow>(
    `
    SELECT
      ps.set_id,
      ps.set_name,
      ps.description,
      ps.section,
      ps.view_codes,
      ps.is_system,
      ps.active,
      upsa.assignment_id,
      upsa.expires_at,
      upsa.reason,
      upsa.assigned_by_user_id,
      upsa.created_at AS assigned_at
    FROM greenhouse_core.user_permission_set_assignments upsa
    INNER JOIN greenhouse_core.permission_sets ps ON ps.set_id = upsa.set_id
    WHERE upsa.user_id = $1
      AND upsa.active = true
      AND ps.active = true
      AND (upsa.expires_at IS NULL OR upsa.expires_at > NOW())
    ORDER BY ps.set_name ASC
    `,
    [userId]
  )

  return rows.map(row => ({
    setId: row.set_id,
    setName: row.set_name,
    description: row.description,
    section: row.section,
    viewCodes: row.view_codes || [],
    isSystem: row.is_system,
    active: row.active,
    assignmentId: row.assignment_id,
    expiresAt: row.expires_at,
    reason: row.reason,
    assignedByUserId: row.assigned_by_user_id,
    assignedAt: row.assigned_at
  }))
}

export const resolvePermissionSetViews = async (userId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ view_codes: string[] }>(
    `
    SELECT ps.view_codes
    FROM greenhouse_core.user_permission_set_assignments upsa
    INNER JOIN greenhouse_core.permission_sets ps ON ps.set_id = upsa.set_id
    WHERE upsa.user_id = $1
      AND upsa.active = true
      AND ps.active = true
      AND (upsa.expires_at IS NULL OR upsa.expires_at > NOW())
    `,
    [userId]
  )

  const viewCodeSet = new Set<string>()

  for (const row of rows) {
    if (row.view_codes) {
      for (const code of row.view_codes) {
        viewCodeSet.add(code)
      }
    }
  }

  return Array.from(viewCodeSet)
}

// ── Internal helpers ──

const getPermissionSetRaw = async (setId: string) => {
  const rows = await runGreenhousePostgresQuery<PermissionSetRow>(
    `SELECT * FROM greenhouse_core.permission_sets WHERE set_id = $1 AND active = true`,
    [setId]
  )

  return rows[0] || null
}

const logViewAccessAction = async ({
  action,
  targetUser,
  viewCode,
  performedBy,
  reason
}: {
  action: string
  targetUser?: string
  viewCode: string
  performedBy: string
  reason?: string
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.view_access_log (action, target_user, view_code, performed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, targetUser || null, viewCode, performedBy, reason || null]
  )
}
