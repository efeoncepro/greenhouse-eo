import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

import type { ScimEligibilityOverride } from './eligibility'

/**
 * TASK-872 Slice 1 — CRUD store para scim_eligibility_overrides.
 *
 * Canonical pattern (mirror TASK-404 user_entitlement_overrides + TASK-721 supersede):
 * - Soft-delete: NUNCA DELETE physically. Use supersedeOverride() para invalidar.
 * - Append-only audit: cada operación INSERT en scim_eligibility_override_changes (same tx).
 * - UNIQUE partial active: 1 fila activa por (mapping, match_type, match_value, effect).
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 */

export type EligibilityOverrideMatchType = 'email' | 'azure_oid' | 'upn'

export type EligibilityOverrideEffect = 'allow' | 'deny'

export type EligibilityOverrideChangeKind = 'created' | 'superseded' | 'expired'

export interface ScimEligibilityOverrideRow {
  readonly overrideId: string
  readonly scimTenantMappingId: string
  readonly matchType: EligibilityOverrideMatchType
  readonly matchValue: string
  readonly effect: EligibilityOverrideEffect
  readonly reason: string
  readonly grantedBy: string
  readonly expiresAt: string | null
  readonly effectiveTo: string | null
  readonly supersededBy: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateOverrideInput {
  readonly scimTenantMappingId: string
  readonly matchType: EligibilityOverrideMatchType
  readonly matchValue: string
  readonly effect: EligibilityOverrideEffect
  readonly reason: string // CHECK length >= 20 enforced en DB
  readonly grantedBy: string
  readonly expiresAt?: string | null // ISO timestamp; NULL = permanente
}

export interface SupersedeOverrideInput {
  readonly overrideId: string
  readonly actorUserId: string
  readonly reason?: string | null
}

export class ScimEligibilityOverrideValidationError extends Error {
  readonly statusCode: number
  readonly details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'ScimEligibilityOverrideValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

const MIN_REASON_LENGTH = 20

const normalizeMatchValue = (matchType: EligibilityOverrideMatchType, value: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new ScimEligibilityOverrideValidationError('matchValue is required.')
  }

  // email + upn + azure_oid: todos se normalizan lowercase para match determinístico
  return trimmed.toLowerCase()
}

const assertReason = (reason: string): string => {
  const trimmed = reason.trim()

  if (trimmed.length < MIN_REASON_LENGTH) {
    throw new ScimEligibilityOverrideValidationError(
      `reason must be at least ${MIN_REASON_LENGTH} characters (got ${trimmed.length}).`,
      400,
      { field: 'reason', minLength: MIN_REASON_LENGTH }
    )
  }

  return trimmed
}

const assertActor = (actor: string): string => {
  const trimmed = actor.trim()

  if (!trimmed) {
    throw new ScimEligibilityOverrideValidationError('grantedBy / actorUserId is required.')
  }

  return trimmed
}

type DbRow = {
  override_id: string
  scim_tenant_mapping_id: string
  match_type: EligibilityOverrideMatchType
  match_value: string
  effect: EligibilityOverrideEffect
  reason: string
  granted_by: string
  expires_at: string | Date | null
  effective_to: string | Date | null
  superseded_by: string | null
  created_at: string | Date
  updated_at: string | Date
} & Record<string, unknown>

const toIso = (value: string | Date | null | undefined): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  
return value
}

const toIsoRequired = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString()
  
return value
}

const fromDbRow = (row: DbRow): ScimEligibilityOverrideRow => ({
  overrideId: row.override_id,
  scimTenantMappingId: row.scim_tenant_mapping_id,
  matchType: row.match_type,
  matchValue: row.match_value,
  effect: row.effect,
  reason: row.reason,
  grantedBy: row.granted_by,
  expiresAt: toIso(row.expires_at),
  effectiveTo: toIso(row.effective_to),
  supersededBy: row.superseded_by,
  createdAt: toIsoRequired(row.created_at),
  updatedAt: toIsoRequired(row.updated_at)
})

const insertAuditChange = async (
  client: PoolClient,
  params: {
    overrideId: string
    changeKind: EligibilityOverrideChangeKind
    actorUserId: string
    reason: string | null
    metadata: Record<string, unknown>
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.scim_eligibility_override_changes (
       change_id, override_id, change_kind, actor_user_id, reason, metadata_json
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      `scim-override-change-${randomUUID()}`,
      params.overrideId,
      params.changeKind,
      params.actorUserId,
      params.reason,
      JSON.stringify(params.metadata)
    ]
  )
}

/**
 * Crea un override (effect=allow|deny). Atomic con audit row en misma tx.
 *
 * UNIQUE partial enforce: si ya existe fila activa para (mapping, match_type,
 * match_value, effect), throws con status 409. El caller debe supersede la
 * existente antes de crear nueva.
 */
export const createScimEligibilityOverride = async (input: CreateOverrideInput): Promise<ScimEligibilityOverrideRow> => {
  const normalizedValue = normalizeMatchValue(input.matchType, input.matchValue)
  const reason = assertReason(input.reason)
  const grantedBy = assertActor(input.grantedBy)
  const overrideId = `scim-override-${randomUUID()}`

  return withTransaction(async client => {
    let rows: DbRow[]

    try {
      const result = await client.query<DbRow>(
        `INSERT INTO greenhouse_core.scim_eligibility_overrides (
           override_id, scim_tenant_mapping_id, match_type, match_value, effect,
           reason, granted_by, expires_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
         RETURNING *`,
        [
          overrideId,
          input.scimTenantMappingId,
          input.matchType,
          normalizedValue,
          input.effect,
          reason,
          grantedBy,
          input.expiresAt ?? null
        ]
      )

      rows = result.rows
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string }

      if (pgError?.code === '23505' && pgError.constraint === 'scim_eligibility_overrides_unique_active') {
        throw new ScimEligibilityOverrideValidationError(
          `Active override already exists for (${input.matchType}=${normalizedValue}, effect=${input.effect}). Supersede existing first.`,
          409,
          { matchType: input.matchType, matchValue: normalizedValue, effect: input.effect }
        )
      }

      throw error
    }

    if (rows.length !== 1) {
      throw new Error('createScimEligibilityOverride: expected exactly 1 row returned, got ' + rows.length)
    }

    await insertAuditChange(client, {
      overrideId,
      changeKind: 'created',
      actorUserId: grantedBy,
      reason,
      metadata: {
        scimTenantMappingId: input.scimTenantMappingId,
        matchType: input.matchType,
        matchValue: normalizedValue,
        effect: input.effect,
        expiresAt: input.expiresAt ?? null
      }
    })

    return fromDbRow(rows[0])
  })
}

/**
 * Supersede (soft-delete) un override activo. Atomic con audit row.
 *
 * NUNCA DELETE physical. Sets `effective_to = NOW()` y mantiene la fila
 * para audit trail forense. Si el override ya está superseded (effective_to NOT
 * NULL), no-op silente (idempotent ante retries).
 */
export const supersedeScimEligibilityOverride = async (input: SupersedeOverrideInput): Promise<ScimEligibilityOverrideRow | null> => {
  const actorUserId = assertActor(input.actorUserId)
  const reasonText = input.reason?.trim() || null

  return withTransaction(async client => {
    const result = await client.query<DbRow>(
      `UPDATE greenhouse_core.scim_eligibility_overrides
       SET effective_to = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE override_id = $1
         AND effective_to IS NULL
       RETURNING *`,
      [input.overrideId]
    )

    if (result.rows.length === 0) {
      return null // idempotent: ya estaba superseded o no existe
    }

    await insertAuditChange(client, {
      overrideId: input.overrideId,
      changeKind: 'superseded',
      actorUserId,
      reason: reasonText,
      metadata: { supersededAt: result.rows[0].effective_to }
    })

    return fromDbRow(result.rows[0])
  })
}

/**
 * Lista los overrides activos para evaluación de elegibilidad.
 * Pre-filtra: effective_to IS NULL AND (expires_at IS NULL OR expires_at > now()).
 *
 * Caller pasa el shape resultante a `evaluateInternalCollaboratorEligibility`.
 */
export const listActiveOverridesForTenantMapping = async (
  scimTenantMappingId: string
): Promise<ScimEligibilityOverride[]> => {
  const rows = await query<DbRow>(
    `SELECT override_id, scim_tenant_mapping_id, match_type, match_value, effect,
            reason, granted_by, expires_at, effective_to, superseded_by, created_at, updated_at
     FROM greenhouse_core.scim_eligibility_overrides
     WHERE scim_tenant_mapping_id = $1
       AND effective_to IS NULL
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
    [scimTenantMappingId]
  )

  return rows.map(row => ({
    overrideId: row.override_id,
    matchType: row.match_type,
    matchValue: row.match_value,
    effect: row.effect
  }))
}

/**
 * Lista TODAS las filas (incluye superseded/expired) — para admin UI + audit.
 * NO usar en hot-path SCIM CREATE (usar listActiveOverridesForTenantMapping).
 */
export const listAllOverridesForTenantMapping = async (
  scimTenantMappingId: string,
  options: { includeSuperseded?: boolean; includeExpired?: boolean } = {}
): Promise<ScimEligibilityOverrideRow[]> => {
  const conditions: string[] = ['scim_tenant_mapping_id = $1']

  if (!options.includeSuperseded) {
    conditions.push('effective_to IS NULL')
  }

  if (!options.includeExpired) {
    conditions.push('(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)')
  }

  const rows = await query<DbRow>(
    `SELECT override_id, scim_tenant_mapping_id, match_type, match_value, effect,
            reason, granted_by, expires_at, effective_to, superseded_by, created_at, updated_at
     FROM greenhouse_core.scim_eligibility_overrides
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    [scimTenantMappingId]
  )

  return rows.map(fromDbRow)
}

/**
 * Reader específico por override_id (admin UI / audit).
 */
export const getScimEligibilityOverrideById = async (overrideId: string): Promise<ScimEligibilityOverrideRow | null> => {
  const rows = await query<DbRow>(
    `SELECT override_id, scim_tenant_mapping_id, match_type, match_value, effect,
            reason, granted_by, expires_at, effective_to, superseded_by, created_at, updated_at
     FROM greenhouse_core.scim_eligibility_overrides
     WHERE override_id = $1`,
    [overrideId]
  )

  return rows[0] ? fromDbRow(rows[0]) : null
}
