import 'server-only'

import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface ResolvedIdentity {
  eoId: string
  identityProfileId: string
  memberId: string | null
  userId: string | null
}

const EO_ID_PATTERN = /^EO-ID\d{4,}$/

/**
 * Resolve any person identifier (EO-ID, memberId, or userId) to a canonical ResolvedIdentity.
 * Queries `person_360` in Postgres to find the unified profile.
 *
 * Returns null if Postgres is not configured or the identifier is not found.
 */
export const resolvePersonIdentifier = async (identifier: string): Promise<ResolvedIdentity | null> => {
  if (!isGreenhousePostgresConfigured()) return null

  try {
    const isEoId = EO_ID_PATTERN.test(identifier)

    const whereClause = isEoId
      ? 'eo_id = $1'
      : 'identity_profile_id = $1 OR member_id = $1 OR user_id = $1'

    const rows = await runGreenhousePostgresQuery<{
      eo_id: string
      identity_profile_id: string
      member_id: string | null
      user_id: string | null
    }>(
      `SELECT eo_id, identity_profile_id, member_id, user_id
       FROM greenhouse_serving.person_360
       WHERE ${whereClause}
       LIMIT 1`,
      [identifier]
    )

    if (!rows[0]) return null

    return {
      eoId: rows[0].eo_id,
      identityProfileId: rows[0].identity_profile_id,
      memberId: rows[0].member_id,
      userId: rows[0].user_id
    }
  } catch {
    return null
  }
}

/**
 * Check if a string looks like an EO-ID (e.g. EO-ID0001).
 */
export const isEoIdFormat = (value: string) => EO_ID_PATTERN.test(value)
