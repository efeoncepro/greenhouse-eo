import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { __clearHomeRolloutFlagCache } from './rollout-flags'

/**
 * TASK-780 Phase 2 — Mutations + listing for `home_rollout_flags`.
 *
 * Surface for admins / ops to control rollout without redeploys. All mutations
 * invalidate the resolver in-memory cache so the next render sees the change.
 *
 * Idempotent semantics: `upsertHomeRolloutFlag` uses `INSERT ... ON CONFLICT
 * DO UPDATE` — re-applying the same payload is safe. Deletions take a key
 * triple `(flag_key, scope_type, scope_id)` and are a no-op when missing.
 */

export type HomeRolloutFlagKey = 'home_v2_shell'
export type HomeRolloutScopeType = 'global' | 'tenant' | 'role' | 'user'

export interface HomeRolloutFlagRow {
  id: number
  flagKey: HomeRolloutFlagKey
  scopeType: HomeRolloutScopeType
  scopeId: string | null
  enabled: boolean
  reason: string | null
  createdAt: string
  updatedAt: string
}

type RawRow = {
  id: number
  flag_key: string
  scope_type: string
  scope_id: string | null
  enabled: boolean
  reason: string | null
  created_at: string
  updated_at: string
} & Record<string, unknown>

const projectRow = (row: RawRow): HomeRolloutFlagRow => ({
  id: Number(row.id),
  flagKey: row.flag_key as HomeRolloutFlagKey,
  scopeType: row.scope_type as HomeRolloutScopeType,
  scopeId: row.scope_id,
  enabled: row.enabled,
  reason: row.reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export interface UpsertHomeRolloutFlagInput {
  flagKey: HomeRolloutFlagKey
  scopeType: HomeRolloutScopeType
  scopeId: string | null
  enabled: boolean
  reason: string
}

export class HomeRolloutFlagValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HomeRolloutFlagValidationError'
  }
}

const validate = (input: UpsertHomeRolloutFlagInput): void => {
  if (input.flagKey !== 'home_v2_shell') {
    throw new HomeRolloutFlagValidationError(
      `Unknown flag_key: ${String(input.flagKey)}. Extend the CHECK constraint before adding new flags.`
    )
  }

  if (!['global', 'tenant', 'role', 'user'].includes(input.scopeType)) {
    throw new HomeRolloutFlagValidationError(`Invalid scope_type: ${String(input.scopeType)}`)
  }

  if (input.scopeType === 'global' && input.scopeId !== null) {
    throw new HomeRolloutFlagValidationError('scope_id must be NULL when scope_type=global')
  }

  if (input.scopeType !== 'global' && (!input.scopeId || input.scopeId.trim() === '')) {
    throw new HomeRolloutFlagValidationError(`scope_id is required when scope_type=${input.scopeType}`)
  }

  if (!input.reason || input.reason.trim().length < 5) {
    throw new HomeRolloutFlagValidationError('reason must be at least 5 chars (audit requirement)')
  }
}

export const listHomeRolloutFlags = async (
  flagKey?: HomeRolloutFlagKey
): Promise<HomeRolloutFlagRow[]> => {
  const sql = flagKey
    ? `SELECT id, flag_key, scope_type, scope_id, enabled, reason, created_at, updated_at
         FROM greenhouse_serving.home_rollout_flags
        WHERE flag_key = $1
        ORDER BY scope_type, scope_id NULLS FIRST`
    : `SELECT id, flag_key, scope_type, scope_id, enabled, reason, created_at, updated_at
         FROM greenhouse_serving.home_rollout_flags
        ORDER BY flag_key, scope_type, scope_id NULLS FIRST`

  const rows = await runGreenhousePostgresQuery<RawRow>(sql, flagKey ? [flagKey] : [])

  return rows.map(projectRow)
}

export const upsertHomeRolloutFlag = async (
  input: UpsertHomeRolloutFlagInput
): Promise<HomeRolloutFlagRow> => {
  validate(input)

  const rows = await runGreenhousePostgresQuery<RawRow>(
    `INSERT INTO greenhouse_serving.home_rollout_flags
       (flag_key, scope_type, scope_id, enabled, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       reason  = EXCLUDED.reason
     RETURNING id, flag_key, scope_type, scope_id, enabled, reason, created_at, updated_at`,
    [input.flagKey, input.scopeType, input.scopeId, input.enabled, input.reason.trim()]
  )

  __clearHomeRolloutFlagCache()

  return projectRow(rows[0])
}

export const deleteHomeRolloutFlag = async (input: {
  flagKey: HomeRolloutFlagKey
  scopeType: HomeRolloutScopeType
  scopeId: string | null
}): Promise<{ deleted: number }> => {
  if (input.scopeType === 'global' && input.scopeId !== null) {
    throw new HomeRolloutFlagValidationError('scope_id must be NULL when scope_type=global')
  }

  if (input.scopeType !== 'global' && !input.scopeId) {
    throw new HomeRolloutFlagValidationError(`scope_id is required when scope_type=${input.scopeType}`)
  }

  const rows = await runGreenhousePostgresQuery<{ id: number }>(
    `DELETE FROM greenhouse_serving.home_rollout_flags
      WHERE flag_key   = $1
        AND scope_type = $2
        AND COALESCE(scope_id, '') = COALESCE($3, '')
      RETURNING id`,
    [input.flagKey, input.scopeType, input.scopeId]
  )

  __clearHomeRolloutFlagCache()

  return { deleted: rows.length }
}
