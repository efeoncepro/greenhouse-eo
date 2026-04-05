import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDb, query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ResponsibilityType, ScopeType } from '@/config/responsibility-codes'
import { RESPONSIBILITY_TYPES, SCOPE_TYPES } from '@/config/responsibility-codes'

// ── Types ──

export interface CreateResponsibilityInput {
  memberId: string
  scopeType: ScopeType
  scopeId: string
  responsibilityType: ResponsibilityType
  isPrimary?: boolean
  effectiveFrom?: string // ISO 8601
  effectiveTo?: string | null // ISO 8601 or null
}

export interface UpdateResponsibilityInput {
  isPrimary?: boolean
  effectiveFrom?: string
  effectiveTo?: string | null
  active?: boolean
}

interface ResponsibilityRow extends Record<string, unknown> {
  responsibility_id: string
  member_id: string
  scope_type: string
  scope_id: string
  responsibility_type: string
  is_primary: boolean
  effective_from: string
  effective_to: string | null
  active: boolean
}

// ── Validation ──

export class ResponsibilityValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ResponsibilityValidationError'
    this.statusCode = statusCode
  }
}

const validateScopeType = (value: unknown): ScopeType => {
  const s = String(value || '').trim()

  if (!SCOPE_TYPES.includes(s as ScopeType)) {
    throw new ResponsibilityValidationError(`scope_type inválido: ${s}. Debe ser: ${SCOPE_TYPES.join(', ')}`)
  }

  return s as ScopeType
}

const validateResponsibilityType = (value: unknown): ResponsibilityType => {
  const s = String(value || '').trim()

  if (!RESPONSIBILITY_TYPES.includes(s as ResponsibilityType)) {
    throw new ResponsibilityValidationError(
      `responsibility_type inválido: ${s}. Debe ser: ${RESPONSIBILITY_TYPES.join(', ')}`
    )
  }

  return s as ResponsibilityType
}

const validateNonEmpty = (value: unknown, fieldName: string): string => {
  const s = String(value || '').trim()

  if (!s) throw new ResponsibilityValidationError(`${fieldName} es requerido.`)

  return s
}

// ── Scope validation (Kysely on existing tables) ──

async function validateScopeExists(scopeType: ScopeType, scopeId: string): Promise<void> {
  const db = await getDb()

  let exists = false

  switch (scopeType) {
    case 'organization': {
      const rows = await db
        .selectFrom('greenhouse_core.organizations')
        .select('organization_id')
        .where('organization_id', '=', scopeId)
        .limit(1)
        .execute()

      exists = rows.length > 0
      break
    }

    case 'space': {
      const rows = await db
        .selectFrom('greenhouse_core.spaces')
        .select('space_id')
        .where('space_id', '=', scopeId)
        .limit(1)
        .execute()

      exists = rows.length > 0
      break
    }

    case 'project': {
      const rows = await db
        .selectFrom('greenhouse_delivery.projects')
        .select('project_record_id')
        .where('project_record_id', '=', scopeId)
        .limit(1)
        .execute()

      exists = rows.length > 0
      break
    }

    case 'department': {
      const rows = await db
        .selectFrom('greenhouse_core.departments')
        .select('department_id')
        .where('department_id', '=', scopeId)
        .limit(1)
        .execute()

      exists = rows.length > 0
      break
    }
  }

  if (!exists) {
    throw new ResponsibilityValidationError(`${scopeType} con id '${scopeId}' no encontrado.`, 404)
  }
}

// ── CRUD ──

export async function createResponsibility(input: CreateResponsibilityInput): Promise<string> {
  const memberId = validateNonEmpty(input.memberId, 'memberId')
  const scopeType = validateScopeType(input.scopeType)
  const scopeId = validateNonEmpty(input.scopeId, 'scopeId')
  const responsibilityType = validateResponsibilityType(input.responsibilityType)
  const isPrimary = input.isPrimary ?? false
  const effectiveFrom = input.effectiveFrom ?? new Date().toISOString()
  const effectiveTo = input.effectiveTo ?? null

  // Validate member exists (Kysely on existing table)
  const db = await getDb()

  const memberRows = await db
    .selectFrom('greenhouse_core.members')
    .select('member_id')
    .where('member_id', '=', memberId)
    .where('active', '=', true)
    .limit(1)
    .execute()

  if (memberRows.length === 0) {
    throw new ResponsibilityValidationError(`Miembro '${memberId}' no encontrado o inactivo.`, 404)
  }

  // Validate scope entity exists
  await validateScopeExists(scopeType, scopeId)

  const responsibilityId = `resp-${randomUUID()}`

  await withTransaction(async (client) => {
    // If marking as primary, demote existing primary for same scope+type
    if (isPrimary) {
      await client.query(
        `UPDATE greenhouse_core.operational_responsibilities
         SET is_primary = FALSE, updated_at = NOW()
         WHERE scope_type = $1 AND scope_id = $2 AND responsibility_type = $3
           AND is_primary = TRUE AND active = TRUE`,
        [scopeType, scopeId, responsibilityType]
      )
    }

    await client.query(
      `INSERT INTO greenhouse_core.operational_responsibilities (
        responsibility_id, member_id, scope_type, scope_id,
        responsibility_type, is_primary, effective_from, effective_to,
        active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())`,
      [responsibilityId, memberId, scopeType, scopeId, responsibilityType, isPrimary, effectiveFrom, effectiveTo]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.operationalResponsibility,
        aggregateId: responsibilityId,
        eventType: EVENT_TYPES.responsibilityAssigned,
        payload: { responsibilityId, memberId, scopeType, scopeId, responsibilityType, isPrimary }
      },
      client
    )
  })

  return responsibilityId
}

export async function updateResponsibility(
  responsibilityId: string,
  input: UpdateResponsibilityInput
): Promise<void> {
  // Raw SQL: table not yet in Kysely types until migration runs
  const rows = await query<ResponsibilityRow>(
    `SELECT responsibility_id, member_id, scope_type, scope_id, responsibility_type,
            is_primary, effective_from::text, effective_to::text, active
     FROM greenhouse_core.operational_responsibilities
     WHERE responsibility_id = $1 AND active = TRUE
     LIMIT 1`,
    [responsibilityId]
  )

  const existing = rows[0]

  if (!existing) {
    throw new ResponsibilityValidationError(`Responsabilidad '${responsibilityId}' no encontrada.`, 404)
  }

  const updates: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  if (input.isPrimary !== undefined) {
    updates.push(`is_primary = $${paramIdx++}`)
    params.push(input.isPrimary)
  }

  if (input.effectiveFrom !== undefined) {
    updates.push(`effective_from = $${paramIdx++}`)
    params.push(input.effectiveFrom)
  }

  if (input.effectiveTo !== undefined) {
    updates.push(`effective_to = $${paramIdx++}`)
    params.push(input.effectiveTo)
  }

  if (input.active !== undefined) {
    updates.push(`active = $${paramIdx++}`)
    params.push(input.active)
  }

  if (updates.length === 0) {
    throw new ResponsibilityValidationError('No se proporcionaron campos para actualizar.')
  }

  updates.push(`updated_at = NOW()`)
  params.push(responsibilityId)

  const isRevocation = input.active === false
  const eventType = isRevocation ? EVENT_TYPES.responsibilityRevoked : EVENT_TYPES.responsibilityUpdated

  await withTransaction(async (client) => {
    // If promoting to primary, demote existing primary
    if (input.isPrimary === true) {
      await client.query(
        `UPDATE greenhouse_core.operational_responsibilities
         SET is_primary = FALSE, updated_at = NOW()
         WHERE scope_type = $1 AND scope_id = $2 AND responsibility_type = $3
           AND is_primary = TRUE AND active = TRUE AND responsibility_id != $4`,
        [existing.scope_type, existing.scope_id, existing.responsibility_type, responsibilityId]
      )
    }

    await client.query(
      `UPDATE greenhouse_core.operational_responsibilities
       SET ${updates.join(', ')}
       WHERE responsibility_id = $${paramIdx}`,
      params
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.operationalResponsibility,
        aggregateId: responsibilityId,
        eventType,
        payload: {
          responsibilityId,
          memberId: existing.member_id,
          scopeType: existing.scope_type,
          scopeId: existing.scope_id,
          responsibilityType: existing.responsibility_type,
          changes: input
        }
      },
      client
    )
  })
}

export async function revokeResponsibility(responsibilityId: string): Promise<void> {
  await updateResponsibility(responsibilityId, { active: false, effectiveTo: new Date().toISOString() })
}
