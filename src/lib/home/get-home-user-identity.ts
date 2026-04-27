import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Canonical identity resolver for the Smart Home v2 Hero.
 *
 * Pulls from `greenhouse_serving.person_360` first (the canonical 360
 * view that fuses HRIS + identity_profiles + client_users + members),
 * then falls back to `greenhouse_core.client_users` directly when the
 * 360 row is missing (e.g. internal-only auth users without a member
 * record yet).
 *
 * Returns the full identity bundle the Hero needs:
 *   - avatarUrl   → `resolved_avatar_url` from 360, else `client_users.avatar_url`
 *   - displayName → `resolved_display_name` (already de-collisioned)
 *   - tenantLabel → derived from tenantType + client/space context
 *
 * Stays cheap: 1 query, indexed on user_id, returns at most 1 row.
 */

export interface HomeUserIdentity {
  userId: string
  displayName: string | null
  firstName: string | null
  fullName: string | null
  avatarUrl: string | null
  tenantLabel: string
  tenantType: 'client' | 'efeonce_internal'
}

interface IdentityRow {
  user_id: string
  resolved_display_name: string | null
  resolved_avatar_url: string | null
  client_users_full_name: string | null
  client_users_avatar_url: string | null
  client_users_tenant_type: string | null
  client_name: string | null
}

const firstNameOf = (full: string | null): string | null => {
  if (!full) return null
  const trimmed = full.trim()

  if (!trimmed) return null

  return trimmed.split(/\s+/)[0]
}

export const getHomeUserIdentity = async (userId: string): Promise<HomeUserIdentity | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<IdentityRow & Record<string, unknown>>(
      `SELECT
         cu.user_id,
         p360.resolved_display_name,
         p360.resolved_avatar_url,
         cu.full_name AS client_users_full_name,
         cu.avatar_url AS client_users_avatar_url,
         cu.tenant_type AS client_users_tenant_type,
         p360.client_name
       FROM greenhouse_core.client_users cu
       LEFT JOIN greenhouse_serving.person_360 p360 ON p360.user_id = cu.user_id
       WHERE cu.user_id = $1
       LIMIT 1`,
      [userId]
    )

    const row = rows[0]

    if (!row) return null

    const tenantType = (row.client_users_tenant_type === 'efeonce_internal' ? 'efeonce_internal' : 'client') as
      | 'efeonce_internal'
      | 'client'

    const fullName = row.resolved_display_name ?? row.client_users_full_name ?? null
    const avatarUrl = row.resolved_avatar_url ?? row.client_users_avatar_url ?? null

    const tenantLabel =
      tenantType === 'efeonce_internal'
        ? 'Efeonce Group'
        : row.client_name?.trim() || 'Cliente Greenhouse'

    return {
      userId: row.user_id,
      displayName: fullName,
      firstName: firstNameOf(fullName),
      fullName,
      avatarUrl,
      tenantLabel,
      tenantType
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home.identity] resolution failed, will fall back to session-only data:',
        error instanceof Error ? error.message : error
      )
    }

    return null
  }
}
