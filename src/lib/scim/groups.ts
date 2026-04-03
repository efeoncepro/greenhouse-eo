import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

// ── Types ──

interface ScimGroupRow {
  [key: string]: unknown
  scim_group_id: string
  microsoft_group_id: string
  display_name: string
  description: string | null
  active: boolean
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface ScimGroupMemberRow {
  [key: string]: unknown
  user_id: string
  scim_id: string | null
  full_name: string | null
  email: string | null
}

export interface ScimGroup {
  schemas: string[]
  id: string
  externalId?: string
  displayName: string
  members: Array<{ value: string; display?: string }>
  meta: {
    resourceType: 'Group'
    created?: string
    lastModified?: string
  }
}

// ── Formatters ──

export const toScimGroup = (
  row: ScimGroupRow,
  members: ScimGroupMemberRow[]
): ScimGroup => ({
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
  id: row.scim_group_id,
  externalId: row.microsoft_group_id,
  displayName: row.display_name,
  members: members.map(m => ({
    value: m.scim_id || m.user_id,
    display: m.full_name || m.email || undefined
  })),
  meta: {
    resourceType: 'Group',
    created: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
    lastModified: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined
  }
})

// ── Queries ──

export const getGroupById = async (id: string): Promise<ScimGroupRow | null> => {
  const rows = await query<ScimGroupRow>(
    `SELECT * FROM greenhouse_core.scim_groups
     WHERE scim_group_id = $1 OR microsoft_group_id = $1
     LIMIT 1`,
    [id]
  )

  return rows[0] ?? null
}

export const getGroupMembers = async (scimGroupId: string): Promise<ScimGroupMemberRow[]> => {
  return query<ScimGroupMemberRow>(
    `SELECT cu.user_id, cu.scim_id, cu.full_name, cu.email
     FROM greenhouse_core.scim_group_memberships gm
     JOIN greenhouse_core.client_users cu ON cu.user_id = gm.user_id
     WHERE gm.scim_group_id = $1 AND gm.active = true`,
    [scimGroupId]
  )
}

export const listGroups = async (
  startIndex: number,
  count: number
): Promise<{ rows: ScimGroupRow[]; total: number }> => {
  const [rows, countResult] = await Promise.all([
    query<ScimGroupRow>(
      `SELECT * FROM greenhouse_core.scim_groups
       WHERE active = true
       ORDER BY display_name
       OFFSET $1 LIMIT $2`,
      [startIndex - 1, count]
    ),
    query<{ [key: string]: unknown; total: string }>(
      `SELECT count(*)::text AS total FROM greenhouse_core.scim_groups WHERE active = true`
    )
  ])

  return { rows, total: Number(countResult[0]?.total ?? 0) }
}

export const queryGroupsByFilter = async (
  field: string,
  value: string
): Promise<ScimGroupRow[]> => {
  if (field === 'displayName') {
    return query<ScimGroupRow>(
      `SELECT * FROM greenhouse_core.scim_groups WHERE display_name = $1 AND active = true`,
      [value]
    )
  }

  if (field === 'externalId') {
    return query<ScimGroupRow>(
      `SELECT * FROM greenhouse_core.scim_groups WHERE microsoft_group_id = $1 AND active = true`,
      [value]
    )
  }

  return []
}

// ── Mutations ──

export const createGroup = async (params: {
  displayName: string
  externalId?: string
  memberIds?: string[]
}): Promise<ScimGroupRow> => {
  const scimGroupId = randomUUID()

  const rows = await query<ScimGroupRow>(
    `INSERT INTO greenhouse_core.scim_groups (
       scim_group_id, microsoft_group_id, display_name, group_type,
       active, synced_at, created_at, updated_at
     ) VALUES ($1, $2, $3, 'unified', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [scimGroupId, params.externalId || scimGroupId, params.displayName]
  )

  // Add members
  if (params.memberIds?.length) {
    await syncGroupMembers(scimGroupId, params.memberIds)
  }

  return rows[0]
}

export const updateGroup = async (
  id: string,
  updates: { displayName?: string; active?: boolean }
): Promise<ScimGroupRow | null> => {
  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (updates.displayName !== undefined) {
    sets.push(`display_name = $${idx}`)
    values.push(updates.displayName)
    idx++
  }

  if (updates.active !== undefined) {
    sets.push(`active = $${idx}`)
    values.push(updates.active)
    idx++
  }

  if (sets.length === 0) return getGroupById(id)

  sets.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  const rows = await query<ScimGroupRow>(
    `UPDATE greenhouse_core.scim_groups
     SET ${sets.join(', ')}
     WHERE scim_group_id = $${idx} OR microsoft_group_id = $${idx}
     RETURNING *`,
    values
  )

  return rows[0] ?? null
}

export const patchGroupMembers = async (
  scimGroupId: string,
  op: 'add' | 'remove',
  memberScimIds: string[]
): Promise<void> => {
  if (memberScimIds.length === 0) return

  if (op === 'add') {
    // Resolve scim_ids to user_ids
    for (const scimId of memberScimIds) {
      const users = await query<{ [key: string]: unknown; user_id: string; microsoft_oid: string | null }>(
        `SELECT user_id, microsoft_oid FROM greenhouse_core.client_users
         WHERE scim_id = $1 OR user_id = $1 LIMIT 1`,
        [scimId]
      )

      if (users[0]) {
        await query(
          `INSERT INTO greenhouse_core.scim_group_memberships
             (scim_group_id, user_id, microsoft_oid, active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (scim_group_id, user_id) DO UPDATE SET active = true`,
          [scimGroupId, users[0].user_id, users[0].microsoft_oid]
        )
      }
    }
  } else {
    // Remove members
    for (const scimId of memberScimIds) {
      await query(
        `UPDATE greenhouse_core.scim_group_memberships
         SET active = false
         WHERE scim_group_id = $1
           AND user_id IN (SELECT user_id FROM greenhouse_core.client_users WHERE scim_id = $2 OR user_id = $2)`,
        [scimGroupId, scimId]
      )
    }
  }
}

const syncGroupMembers = async (
  scimGroupId: string,
  memberScimIds: string[]
): Promise<void> => {
  for (const scimId of memberScimIds) {
    const users = await query<{ [key: string]: unknown; user_id: string; microsoft_oid: string | null }>(
      `SELECT user_id, microsoft_oid FROM greenhouse_core.client_users
       WHERE scim_id = $1 OR user_id = $1 LIMIT 1`,
      [scimId]
    )

    if (users[0]) {
      await query(
        `INSERT INTO greenhouse_core.scim_group_memberships
           (scim_group_id, user_id, microsoft_oid, active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (scim_group_id, user_id) DO UPDATE SET active = true`,
        [scimGroupId, users[0].user_id, users[0].microsoft_oid]
      )
    }
  }
}
