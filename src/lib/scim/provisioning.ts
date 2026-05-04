import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDb, query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { openOffboardingNeedsReviewFromMember } from '@/lib/workforce/offboarding'

import type { ScimUserRow } from './formatters'

// ── Types ──

interface CreateUserInput {
  email: string
  displayName: string
  microsoftOid: string
  microsoftTenantId?: string | null
  microsoftEmail: string
  clientId: string | null
  tenantType: string
  defaultRoleCode: string
  active: boolean
}

interface UpdateUserInput {
  active?: boolean
  displayName?: string
  email?: string
  microsoftOid?: string
}

interface TenantMapping {
  scim_tenant_mapping_id: string
  microsoft_tenant_id: string
  tenant_name: string | null
  client_id: string | null
  space_id: string | null
  default_role_code: string
  allowed_email_domains: string[]
  auto_provision: boolean
}

// ── Tenant Mapping Resolution ──

export const getTenantMappingByDomain = async (emailDomain: string): Promise<TenantMapping | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.scim_tenant_mappings')
    .select([
      'scim_tenant_mapping_id',
      'microsoft_tenant_id',
      'tenant_name',
      'client_id',
      'space_id',
      'default_role_code',
      'allowed_email_domains',
      'auto_provision'
    ])
    .where('active', '=', true)
    .where(
      (eb) => eb.fn('array_position', [eb.ref('allowed_email_domains'), eb.val(emailDomain.toLowerCase())]),
      'is not',
      null
    )
    .executeTakeFirst()

  return row ?? null
}

export const getTenantMappingByTenantId = async (tenantId: string): Promise<TenantMapping | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.scim_tenant_mappings')
    .select([
      'scim_tenant_mapping_id',
      'microsoft_tenant_id',
      'tenant_name',
      'client_id',
      'space_id',
      'default_role_code',
      'allowed_email_domains',
      'auto_provision'
    ])
    .where('active', '=', true)
    .where('microsoft_tenant_id', '=', tenantId)
    .executeTakeFirst()

  return row ?? null
}

// ── User Queries ──

const USER_SELECT_COLUMNS = [
  'user_id',
  'scim_id',
  'email',
  'full_name',
  'microsoft_oid',
  'microsoft_email',
  'active',
  'created_at',
  'updated_at'
] as const

const getMemberIdForScimUser = async (userId: string, email: string | null | undefined) => {
  const rows = await query<{ member_id: string }>(
    `
      SELECT m.member_id
      FROM greenhouse_core.client_users cu
      INNER JOIN greenhouse_core.members m
        ON m.identity_profile_id = cu.identity_profile_id
        OR lower(m.primary_email) = lower(cu.email)
        OR lower(m.primary_email) = lower(cu.microsoft_email)
      WHERE cu.user_id = $1
         OR lower(cu.email) = lower($2)
         OR lower(cu.microsoft_email) = lower($2)
      ORDER BY m.active DESC, m.created_at ASC
      LIMIT 1
    `,
    [userId, email ?? '']
  )

  return rows[0]?.member_id ?? null
}

export const getUserByScimId = async (scimId: string): Promise<ScimUserRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.client_users')
    .select(USER_SELECT_COLUMNS)
    .where('scim_id', '=', scimId)
    .executeTakeFirst()

  return (row as ScimUserRow | undefined) ?? null
}

export const getUserByExternalId = async (externalId: string): Promise<ScimUserRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.client_users')
    .select(USER_SELECT_COLUMNS)
    .where('microsoft_oid', '=', externalId)
    .executeTakeFirst()

  return (row as ScimUserRow | undefined) ?? null
}

export const getUserByEmail = async (email: string): Promise<ScimUserRow | null> => {
  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.client_users')
    .select(USER_SELECT_COLUMNS)
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst()

  return (row as ScimUserRow | undefined) ?? null
}

export const getUserById = async (id: string): Promise<ScimUserRow | null> => {
  const db = await getDb()

  // Try scim_id first, then user_id
  const row = await db
    .selectFrom('greenhouse_core.client_users')
    .select(USER_SELECT_COLUMNS)
    .where((eb) =>
      eb.or([eb('scim_id', '=', id), eb('user_id', '=', id)])
    )
    .executeTakeFirst()

  return (row as ScimUserRow | undefined) ?? null
}

export const queryUsersByFilter = async (
  field: string,
  value: string
): Promise<ScimUserRow[]> => {
  const db = await getDb()

  let q = db
    .selectFrom('greenhouse_core.client_users')
    .select(USER_SELECT_COLUMNS)

  if (field === 'userName') {
    q = q.where((eb) =>
      eb.or([
        eb('microsoft_email', '=', value),
        eb('email', '=', value)
      ])
    )
  } else if (field === 'externalId') {
    q = q.where('microsoft_oid', '=', value)
  } else {
    return []
  }

  const rows = await q.execute()

  return rows as ScimUserRow[]
}

export const listUsers = async (
  startIndex: number,
  count: number
): Promise<{ rows: ScimUserRow[]; total: number }> => {
  const db = await getDb()

  const [rows, countResult] = await Promise.all([
    db
      .selectFrom('greenhouse_core.client_users')
      .select(USER_SELECT_COLUMNS)
      .orderBy('created_at', 'desc')
      .offset(startIndex - 1)
      .limit(count)
      .execute(),
    db
      .selectFrom('greenhouse_core.client_users')
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .executeTakeFirst()
  ])

  return {
    rows: rows as ScimUserRow[],
    total: Number(countResult?.total ?? 0)
  }
}

// ── User Mutations ──

export const createUser = async (input: CreateUserInput): Promise<ScimUserRow> => {
  const userId = randomUUID()
  const scimId = randomUUID()
  const isInternalTenant = input.tenantType === 'efeonce_internal' || input.clientId === null

  const rows = await query<ScimUserRow>(
    `INSERT INTO greenhouse_core.client_users (
      user_id, scim_id, client_id, email, full_name,
      tenant_type, auth_mode, status, active,
      microsoft_oid, microsoft_tenant_id, microsoft_email,
      provisioned_by, provisioned_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, 'active', $8,
      $9, $10, $11,
      'scim', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING ${USER_SELECT_COLUMNS.join(', ')}`,
    [
      userId,
      scimId,
      input.clientId,
      input.email.toLowerCase(),
      input.displayName,
      isInternalTenant ? 'efeonce_internal' : (input.tenantType || 'client'),
      'microsoft_sso',
      input.active,
      input.microsoftOid,
      input.microsoftTenantId || null,
      input.microsoftEmail
    ]
  )

  // Assign baseline role
  const assignmentId = `scim-role-${randomUUID()}`

  await query(
    `INSERT INTO greenhouse_core.user_role_assignments (
      assignment_id, user_id, role_code, client_id,
      scope_level, status, active, effective_from,
      assigned_by_user_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, 'active', true, CURRENT_TIMESTAMP,
      'scim-provisioning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    [
      assignmentId,
      userId,
      input.defaultRoleCode,
      input.clientId,
      isInternalTenant ? null : 'tenant_all'
    ]
  )

  // Publish outbox event
  await publishOutboxEvent({
    aggregateType: 'client_user',
    aggregateId: userId,
    eventType: 'scim.user.created',
    payload: {
      userId,
      scimId,
      email: input.email,
      microsoftOid: input.microsoftOid,
      clientId: input.clientId,
      roleCode: input.defaultRoleCode,
      provisionedBy: 'scim'
    }
  })

  return rows[0]
}

export const updateUser = async (
  id: string,
  updates: UpdateUserInput
): Promise<ScimUserRow | null> => {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  if (updates.active !== undefined) {
    setClauses.push(`active = $${paramIdx}`)
    values.push(updates.active)
    paramIdx++

    setClauses.push(`status = $${paramIdx}`)
    values.push(updates.active ? 'active' : 'deactivated')
    paramIdx++

    if (!updates.active) {
      setClauses.push(`deactivated_at = CURRENT_TIMESTAMP`)
    }
  }

  if (updates.displayName !== undefined) {
    setClauses.push(`full_name = $${paramIdx}`)
    values.push(updates.displayName)
    paramIdx++
  }

  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIdx}`)
    values.push(updates.email.toLowerCase())
    paramIdx++

    setClauses.push(`microsoft_email = $${paramIdx}`)
    values.push(updates.email.toLowerCase())
    paramIdx++
  }

  if (updates.microsoftOid !== undefined) {
    setClauses.push(`microsoft_oid = $${paramIdx}`)
    values.push(updates.microsoftOid)
    paramIdx++
  }

  if (setClauses.length === 0) return getUserById(id)

  setClauses.push('updated_at = CURRENT_TIMESTAMP')

  values.push(id)

  const rows = await query<ScimUserRow>(
    `UPDATE greenhouse_core.client_users
     SET ${setClauses.join(', ')}
     WHERE scim_id = $${paramIdx} OR user_id = $${paramIdx}
     RETURNING ${USER_SELECT_COLUMNS.join(', ')}`,
    values
  )

  if (rows.length === 0) return null

  const eventType = updates.active === false ? 'scim.user.deactivated' : 'scim.user.updated'

  await publishOutboxEvent({
    aggregateType: 'client_user',
    aggregateId: rows[0].user_id,
    eventType,
    payload: {
      userId: rows[0].user_id,
      scimId: rows[0].scim_id,
      updates
    }
  })

  // Canonical user lifecycle event (TASK-253)
  if (updates.active === false) {
    publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.userLifecycle,
      aggregateId: rows[0].user_id,
      eventType: EVENT_TYPES.userDeactivated,
      payload: { userId: rows[0].user_id, deactivatedBy: 'scim' }
    }).catch(() => {})

    getMemberIdForScimUser(rows[0].user_id, rows[0].email)
      .then(memberId => {
        if (!memberId) return null

        return openOffboardingNeedsReviewFromMember({
          memberId,
          source: 'scim',
          separationType: 'identity_only',
          actorUserId: rows[0].user_id,
          sourceRef: {
            source: 'scim.updateUser',
            scimId: rows[0].scim_id,
            updates
          },
          notes: 'SCIM desactivó acceso. Requiere revisión HR si corresponde a salida laboral.'
        })
      })
      .catch(error => {
        console.warn('[scim] Unable to open offboarding needs_review case after deactivation:', error)
      })
  } else if (updates.active === true) {
    publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.userLifecycle,
      aggregateId: rows[0].user_id,
      eventType: EVENT_TYPES.userReactivated,
      payload: { userId: rows[0].user_id, reactivatedBy: 'scim' }
    }).catch(() => {})
  }

  return rows[0]
}

// ── Sync Log ──

export const logScimOperation = async (params: {
  operation: string
  scimId?: string | null
  externalId?: string | null
  email?: string | null
  microsoftTenantId?: string | null
  requestSummary?: Record<string, unknown> | null
  responseStatus: number
  errorMessage?: string | null
}): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_core.scim_sync_log (
      operation, scim_id, external_id, email,
      microsoft_tenant_id, request_summary, response_status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      params.operation,
      params.scimId || null,
      params.externalId || null,
      params.email || null,
      params.microsoftTenantId || null,
      params.requestSummary ? JSON.stringify(params.requestSummary) : null,
      params.responseStatus,
      params.errorMessage || null
    ]
  )
}
