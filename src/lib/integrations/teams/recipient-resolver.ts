import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-671 — resolve a Greenhouse member_id to a Microsoft Graph user id (aadObjectId)
 * suitable for posting a 1:1 chat from the Greenhouse Teams bot.
 *
 * Resolution order (cheap → expensive, more authoritative → less authoritative):
 *
 *   1. members.teams_user_id           — populated by the People module syncs
 *   2. client_users.microsoft_oid       — populated when the principal has signed in
 *                                         via Azure AD SSO at least once
 *   3. client_users.email + Graph fallback (caller's responsibility)
 *
 * The function only handles paths 1 and 2; path 3 (Graph search by email) lives in the
 * sender so it can use an authenticated bot token. We return the email so the sender
 * can decide.
 */

const CACHE_TTL_MS = 5 * 60 * 1_000
const cache = new Map<string, { value: TeamsRecipientResolution | null; expiresAt: number }>()

export type TeamsRecipientResolutionSource =
  | 'members.teams_user_id'
  | 'client_users.microsoft_oid'
  | 'client_users.email'

export interface TeamsRecipientResolution {
  source: TeamsRecipientResolutionSource
  /** Microsoft Graph user id (aadObjectId). null when only `email` is known. */
  aadObjectId: string | null
  email: string | null
  memberId: string
}

interface ResolverRow extends Record<string, unknown> {
  member_id: string
  teams_user_id: string | null
  microsoft_oid: string | null
  microsoft_email: string | null
  client_user_email: string | null
}

const lookupRow = async (memberId: string): Promise<ResolverRow | null> => {
  const rows = await runGreenhousePostgresQuery<ResolverRow>(
    `SELECT
        m.member_id,
        m.teams_user_id,
        cu.microsoft_oid,
        cu.microsoft_email,
        cu.email AS client_user_email
       FROM greenhouse_core.members m
  LEFT JOIN greenhouse_core.client_users cu
         ON cu.identity_profile_id IS NOT NULL
        AND cu.identity_profile_id = m.identity_profile_id
      WHERE m.member_id = $1
      LIMIT 1`,
    [memberId]
  )

  return rows[0] || null
}

/**
 * Resolve a Greenhouse member_id to a Microsoft Graph user reference.
 * Returns `null` if the member is unknown or has no Microsoft identity at all.
 */
export const resolveTeamsUserForMember = async (
  memberId: string,
  options: { bypassCache?: boolean; now?: () => number } = {}
): Promise<TeamsRecipientResolution | null> => {
  if (!memberId || typeof memberId !== 'string') return null

  const now = options.now || Date.now
  const cached = cache.get(memberId)

  if (!options.bypassCache && cached && cached.expiresAt > now()) {
    return cached.value
  }

  const row = await lookupRow(memberId)

  let resolution: TeamsRecipientResolution | null = null

  if (row) {
    if (row.teams_user_id) {
      resolution = {
        source: 'members.teams_user_id',
        aadObjectId: row.teams_user_id,
        email: row.microsoft_email || row.client_user_email,
        memberId: row.member_id
      }
    } else if (row.microsoft_oid) {
      resolution = {
        source: 'client_users.microsoft_oid',
        aadObjectId: row.microsoft_oid,
        email: row.microsoft_email || row.client_user_email,
        memberId: row.member_id
      }
    } else if (row.client_user_email) {
      resolution = {
        source: 'client_users.email',
        aadObjectId: null,
        email: row.client_user_email,
        memberId: row.member_id
      }
    }
  }

  cache.set(memberId, {
    value: resolution,
    expiresAt: now() + CACHE_TTL_MS
  })

  return resolution
}

/**
 * Apply a routing rule like `{ from: 'payload.assigneeMemberId' }` against an event
 * payload to extract the canonical member_id. Returns null if the path is missing or
 * the value is not a non-empty string.
 */
export const extractMemberIdFromPayload = (
  payload: unknown,
  rule: { from: string } | null | undefined
): string | null => {
  if (!rule || typeof rule.from !== 'string' || !rule.from.length) return null
  if (!payload || typeof payload !== 'object') return null

  const segments = rule.from.split('.')
  let current: unknown = payload

  for (const segment of segments) {
    if (segment === 'payload') {
      // The convention is `payload.<path>`; the first segment is a label, not a key.
      // We allow callers to omit it, in which case `current` stays as is.
      continue
    }

    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return null
    }
  }

  if (typeof current !== 'string' || !current.trim().length) return null

  return current.trim()
}

/** Test-only: clear the in-memory cache. */
export const __resetTeamsRecipientResolverCache = () => {
  cache.clear()
}
