import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { isSpaceAccessVerb, type SpaceAccessVerb } from './types'

/**
 * TASK-2096 — the only writer of `greenhouse_core.space_access_grants`.
 *
 * Every write runs in one transaction with its audit event (`identity.space_access.*`). Grants are
 * versioned, never deleted: a revoke flips `active` and bumps `version`, so a context selected
 * under the old version is detected as stale by `revalidateSpaceContext`. Callers may pass the
 * version they read; a concurrent change then fails with `version_conflict` instead of being
 * overwritten.
 *
 * There is no HTTP command yet: provisioning the second Space and its grants is TASK-2099, and
 * opening a real client is TASK-1852. Until then this store is exercised by the local lab only.
 */

export type SpaceAccessGrantErrorCode =
  | 'invalid_input'
  | 'space_not_found'
  | 'space_inactive'
  | 'profile_not_in_client'
  | 'grant_not_found'
  | 'version_conflict'

export class SpaceAccessGrantError extends Error {
  readonly statusCode: number

  constructor(readonly code: SpaceAccessGrantErrorCode, statusCode: number) {
    super(`space_access_grant:${code}`)
    this.name = 'SpaceAccessGrantError'
    this.statusCode = statusCode
  }
}

export type SpaceAccessGrantRecord = {
  grantId: string
  identityProfileId: string
  organizationId: string
  spaceId: string
  verbs: SpaceAccessVerb[]
  version: number
  active: boolean
  validFrom: string
  validTo: string | null
}

type GrantRow = {
  grant_id: string
  identity_profile_id: string
  organization_id: string
  space_id: string
  verbs: string[]
  version: number
  active: boolean
  valid_from: Date | string
  valid_to: Date | string | null
}

const toIso = (value: Date | string | null) =>
  value === null ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toRecord = (row: GrantRow): SpaceAccessGrantRecord => ({
  grantId: row.grant_id,
  identityProfileId: row.identity_profile_id,
  organizationId: row.organization_id,
  spaceId: row.space_id,
  verbs: row.verbs.filter(isSpaceAccessVerb),
  version: Number(row.version),
  active: row.active,
  validFrom: toIso(row.valid_from)!,
  validTo: toIso(row.valid_to)
})

const GRANT_COLUMNS = `grant_id, identity_profile_id, organization_id, space_id, verbs, version, active, valid_from, valid_to`

const assertReason = (reason: string) => {
  if (typeof reason !== 'string' || reason.trim().length < 10) throw new SpaceAccessGrantError('invalid_input', 400)
}

const assertActor = (actorUserId: string) => {
  if (typeof actorUserId !== 'string' || actorUserId.trim().length === 0) throw new SpaceAccessGrantError('invalid_input', 400)
}

const normalizeVerbs = (verbs: readonly string[]) => {
  const unique = Array.from(new Set(verbs))

  if (unique.length === 0 || !unique.every(isSpaceAccessVerb)) throw new SpaceAccessGrantError('invalid_input', 400)

  return unique as SpaceAccessVerb[]
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'

export type GrantSpaceAccessInput = {
  identityProfileId: string
  spaceId: string
  verbs: readonly string[]
  reason: string
  actorUserId: string
  validTo?: string | null
  /** Version the caller read; omit only when creating a grant that should not exist yet. */
  expectedVersion?: number
}

/** Create or update the single active grant of a person over a Space. */
export const grantSpaceAccess = async (input: GrantSpaceAccessInput): Promise<SpaceAccessGrantRecord> => {
  assertReason(input.reason)
  assertActor(input.actorUserId)
  const verbs = normalizeVerbs(input.verbs)

  try {
    return await withTransaction(async (client: PoolClient) => {
      const space = (await client.query<{ organization_id: string | null; client_id: string | null; active: boolean }>(
        `SELECT organization_id, client_id, active FROM greenhouse_core.spaces WHERE space_id = $1 FOR SHARE`,
        [input.spaceId]
      )).rows[0]

      if (!space || !space.organization_id || !space.client_id) throw new SpaceAccessGrantError('space_not_found', 404)
      if (!space.active) throw new SpaceAccessGrantError('space_inactive', 409)

      // Tenant boundary: a grant only reaches people who already belong to the Space's client.
      const member = await client.query(
        `SELECT 1 FROM greenhouse_core.client_users
          WHERE identity_profile_id = $1 AND client_id = $2 AND active = true AND status = 'active'
          LIMIT 1`,
        [input.identityProfileId, space.client_id]
      )

      if (member.rowCount === 0) throw new SpaceAccessGrantError('profile_not_in_client', 422)

      const existing = (await client.query<GrantRow>(
        `SELECT ${GRANT_COLUMNS} FROM greenhouse_core.space_access_grants
          WHERE identity_profile_id = $1 AND space_id = $2 AND active = true
          FOR UPDATE`,
        [input.identityProfileId, input.spaceId]
      )).rows[0]

      if (input.expectedVersion !== undefined && (existing ? Number(existing.version) : 0) !== input.expectedVersion) {
        throw new SpaceAccessGrantError('version_conflict', 409)
      }

      const row = existing
        ? (await client.query<GrantRow>(
            `UPDATE greenhouse_core.space_access_grants
                SET verbs = $2, valid_to = $3, reason = $4, granted_by = $5,
                    version = version + 1, updated_at = now()
              WHERE grant_id = $1
              RETURNING ${GRANT_COLUMNS}`,
            [existing.grant_id, verbs, input.validTo ?? null, input.reason.trim(), input.actorUserId]
          )).rows[0]
        : (await client.query<GrantRow>(
            `INSERT INTO greenhouse_core.space_access_grants
               (identity_profile_id, organization_id, space_id, verbs, valid_to, reason, granted_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING ${GRANT_COLUMNS}`,
            [input.identityProfileId, space.organization_id, input.spaceId, verbs, input.validTo ?? null,
              input.reason.trim(), input.actorUserId]
          )).rows[0]

      const record = toRecord(row)

      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.spaceAccessGrant,
        aggregateId: record.grantId,
        eventType: EVENT_TYPES.spaceAccessGranted,
        payload: { ...record, actorUserId: input.actorUserId, previousVersion: existing ? Number(existing.version) : null }
      }, client)

      return record
    })
  } catch (error) {
    // The partial unique index is the race guard when two first grants commit concurrently.
    if (isUniqueViolation(error)) throw new SpaceAccessGrantError('version_conflict', 409)
    throw error
  }
}

export type RevokeSpaceAccessInput = {
  grantId: string
  reason: string
  actorUserId: string
  expectedVersion?: number
}

/** Revoke a grant. Revoking an already revoked grant returns it unchanged (idempotent). */
export const revokeSpaceAccess = async (input: RevokeSpaceAccessInput): Promise<SpaceAccessGrantRecord> => {
  assertReason(input.reason)
  assertActor(input.actorUserId)

  return withTransaction(async (client: PoolClient) => {
    const existing = (await client.query<GrantRow>(
      `SELECT ${GRANT_COLUMNS} FROM greenhouse_core.space_access_grants WHERE grant_id = $1 FOR UPDATE`,
      [input.grantId]
    )).rows[0]

    if (!existing) throw new SpaceAccessGrantError('grant_not_found', 404)

    if (input.expectedVersion !== undefined && Number(existing.version) !== input.expectedVersion) {
      throw new SpaceAccessGrantError('version_conflict', 409)
    }

    if (!existing.active) return toRecord(existing)

    const row = (await client.query<GrantRow>(
      `UPDATE greenhouse_core.space_access_grants
          SET active = false, version = version + 1, revoked_at = now(), revoked_by = $2,
              reason = $3, updated_at = now()
        WHERE grant_id = $1
        RETURNING ${GRANT_COLUMNS}`,
      [input.grantId, input.actorUserId, input.reason.trim()]
    )).rows[0]

    const record = toRecord(row)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.spaceAccessGrant,
      aggregateId: record.grantId,
      eventType: EVENT_TYPES.spaceAccessRevoked,
      payload: { ...record, actorUserId: input.actorUserId, previousVersion: Number(existing.version) }
    }, client)

    return record
  })
}
