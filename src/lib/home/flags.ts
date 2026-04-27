import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeBlockId } from './contract'

/**
 * Per-block kill switches for Smart Home v2.
 *
 * Reads `greenhouse_serving.home_block_flags` and resolves with precedence:
 *   user > role > tenant > global
 *
 * Default behavior when no row matches: enabled. We never crash a render
 * because the flags table is unreachable — caller swallows errors and
 * returns the conservative default.
 *
 * The composer batch-loads flags once per request to keep PG hits at one,
 * regardless of how many blocks render.
 */

export interface HomeFlagSubject {
  userId: string
  tenantId: string | null
  roleCodes: string[]
}

type FlagRow = {
  block_id: string
  scope_type: 'global' | 'tenant' | 'role' | 'user'
  scope_id: string | null
  enabled: boolean
} & Record<string, unknown>

interface ResolvedFlags {
  enabled: Record<HomeBlockId, boolean>
}

const ALL_BLOCKS: HomeBlockId[] = [
  'hero-ai',
  'pulse-strip',
  'today-inbox',
  'closing-countdown',
  'ai-insights-bento',
  'recents-rail',
  'reliability-ribbon'
]

const SCOPE_PRECEDENCE: Record<FlagRow['scope_type'], number> = {
  user: 4,
  role: 3,
  tenant: 2,
  global: 1
}

const matchesSubject = (row: FlagRow, subject: HomeFlagSubject): boolean => {
  switch (row.scope_type) {
    case 'global':
      return true
    case 'tenant':
      return subject.tenantId !== null && row.scope_id === subject.tenantId
    case 'role':
      return row.scope_id !== null && subject.roleCodes.includes(row.scope_id)
    case 'user':
      return row.scope_id === subject.userId
    default:
      return false
  }
}

/**
 * Load every flag row that could affect this subject in a single query
 * and project them to a per-block `enabled` lookup.
 *
 * If the table doesn't exist yet (pre-migration runtime) or the query
 * fails for any reason, we return all-enabled — never block a render.
 */
export const resolveHomeBlockFlags = async (subject: HomeFlagSubject): Promise<ResolvedFlags> => {
  const enabled = ALL_BLOCKS.reduce<Record<HomeBlockId, boolean>>((acc, blockId) => {
    acc[blockId] = true

    return acc
  }, {} as Record<HomeBlockId, boolean>)

  let rows: FlagRow[] = []

  try {
    rows = await runGreenhousePostgresQuery<FlagRow>(
      `SELECT block_id, scope_type, scope_id, enabled
         FROM greenhouse_serving.home_block_flags
        WHERE scope_type = 'global'
           OR (scope_type = 'tenant' AND scope_id = $1)
           OR (scope_type = 'role'   AND scope_id = ANY($2::text[]))
           OR (scope_type = 'user'   AND scope_id = $3)`,
      [subject.tenantId, subject.roleCodes, subject.userId]
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home-flags] kill-switch lookup failed, defaulting to enabled:',
        error instanceof Error ? error.message : error
      )
    }

    return { enabled }
  }

  const winningRow = new Map<HomeBlockId, FlagRow>()

  for (const row of rows) {
    if (!ALL_BLOCKS.includes(row.block_id as HomeBlockId)) continue
    if (!matchesSubject(row, subject)) continue

    const blockId = row.block_id as HomeBlockId
    const current = winningRow.get(blockId)

    if (!current || SCOPE_PRECEDENCE[row.scope_type] > SCOPE_PRECEDENCE[current.scope_type]) {
      winningRow.set(blockId, row)
    }
  }

  for (const [blockId, row] of winningRow.entries()) {
    enabled[blockId] = row.enabled
  }

  return { enabled }
}

/**
 * Global rollout flag. Drives v1 vs v2 home rendering at deploy time.
 * Honors per-user opt-out via `client_users.home_v2_opt_out` (read by
 * the page, not here — this only governs the global default).
 */
export const isHomeV2GloballyEnabled = (): boolean => {
  const value = (process.env.HOME_V2_ENABLED ?? '').trim().toLowerCase()

  return value === 'true' || value === '1' || value === 'on'
}
