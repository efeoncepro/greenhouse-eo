import 'server-only'

import { query } from '@/lib/db'

interface MemberOwnerIdentityRow extends Record<string, unknown> {
  member_id: string
  hubspot_owner_id: string | null
  email_aliases: string[] | null
  canonical_email: string | null
  resolved_email: string | null
  member_email: string | null
  user_email: string | null
  user_id: string | null
}

export interface HubSpotOwnerIdentity {
  memberId: string
  hubspotOwnerId: string | null
  candidateEmails: string[]
}

export interface HubSpotActorIdentityInput {
  memberId?: string | null
  identityProfileId?: string | null
  userId?: string | null
}

export interface HubSpotOwnerBinding {
  memberId: string | null
  userId: string | null
  email: string | null
}

export const normalizeHubSpotOwnerCandidateEmails = (
  values: Array<string | null | undefined>
) =>
  [
    ...new Set(
      values
        .flatMap(value => {
          if (!value) return []

          return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
        })
        .filter(value => value.includes('@'))
        .map(value => value.toLowerCase())
    )
  ]

const OWNER_IDENTITY_SELECT = `
  SELECT m.member_id,
         m.hubspot_owner_id,
         m.email_aliases,
         p360.canonical_email,
         p360.resolved_email,
         p360.member_email,
         p360.user_email,
         p360.user_id
    FROM greenhouse_core.members AS m
    LEFT JOIN greenhouse_serving.person_360 AS p360
      ON p360.identity_profile_id = m.identity_profile_id
`

const mapOwnerIdentity = (
  row: MemberOwnerIdentityRow | null | undefined,
  fallbackMemberId: string | null = null,
  extraEmails: Array<string | null | undefined> = []
): HubSpotOwnerIdentity => ({
  memberId: row?.member_id ?? fallbackMemberId ?? '',
  hubspotOwnerId: row?.hubspot_owner_id ?? null,
  candidateEmails: normalizeHubSpotOwnerCandidateEmails([
    row?.member_email,
    ...(row?.email_aliases ?? []),
    row?.canonical_email,
    row?.resolved_email,
    row?.user_email,
    ...extraEmails
  ])
})

export const loadActorHubSpotOwnerIdentity = async (
  actor: HubSpotActorIdentityInput
): Promise<HubSpotOwnerIdentity> => {
  if (actor.memberId) {
    const rows = await query<MemberOwnerIdentityRow>(
      `${OWNER_IDENTITY_SELECT}
       WHERE m.member_id = $1
       LIMIT 1`,
      [actor.memberId]
    )

    const row = rows[0]

    if (row) {
      return mapOwnerIdentity(row, actor.memberId, [actor.userId])
    }
  }

  if (actor.identityProfileId) {
    const rows = await query<MemberOwnerIdentityRow>(
      `${OWNER_IDENTITY_SELECT}
       WHERE m.identity_profile_id = $1
       LIMIT 1`,
      [actor.identityProfileId]
    )

    const row = rows[0]

    if (row) {
      return mapOwnerIdentity(row, row.member_id ?? actor.memberId ?? null, [actor.userId])
    }
  }

  if (actor.userId) {
    const rows = await query<MemberOwnerIdentityRow>(
      `${OWNER_IDENTITY_SELECT}
       WHERE (
              p360.user_id = $1
           OR p360.user_email = $1
           OR p360.resolved_email = $1
           OR p360.canonical_email = $1
           OR p360.member_email = $1
           OR $1 = ANY(COALESCE(m.email_aliases, ARRAY[]::text[]))
       )
       LIMIT 1`,
      [actor.userId]
    )

    const row = rows[0]

    if (row) {
      return mapOwnerIdentity(row, row.member_id ?? actor.memberId ?? null, [actor.userId])
    }
  }

  return {
    memberId: actor.memberId ?? '',
    hubspotOwnerId: null,
    candidateEmails: normalizeHubSpotOwnerCandidateEmails([actor.userId])
  }
}

export const listHubSpotOwnerIdentities = async (): Promise<HubSpotOwnerIdentity[]> => {
  const rows = await query<MemberOwnerIdentityRow>(
    `${OWNER_IDENTITY_SELECT}
     WHERE m.active = TRUE
       AND (
            (p360.member_email IS NOT NULL AND btrim(p360.member_email) <> '')
         OR COALESCE(cardinality(m.email_aliases), 0) > 0
         OR (p360.canonical_email IS NOT NULL AND btrim(p360.canonical_email) <> '')
         OR (p360.resolved_email IS NOT NULL AND btrim(p360.resolved_email) <> '')
         OR (p360.user_email IS NOT NULL AND btrim(p360.user_email) <> '')
       )
     ORDER BY m.member_id ASC`
  )

  return rows.map(row => mapOwnerIdentity(row))
}

export const loadHubSpotOwnerBindingByOwnerId = async (
  hubspotOwnerId: string | null | undefined
): Promise<HubSpotOwnerBinding | null> => {
  const normalizedOwnerId = hubspotOwnerId?.trim()

  if (!normalizedOwnerId) {
    return null
  }

  const rows = await query<{
    member_id: string | null
    user_id: string | null
    email: string | null
  }>(
    `SELECT m.member_id,
            p360.user_id,
            COALESCE(p360.user_email, p360.resolved_email, p360.canonical_email, p360.member_email) AS email
       FROM greenhouse_core.members AS m
       LEFT JOIN greenhouse_serving.person_360 AS p360
         ON p360.identity_profile_id = m.identity_profile_id
      WHERE m.hubspot_owner_id = $1
      LIMIT 1`,
    [normalizedOwnerId]
  )

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    memberId: row.member_id ?? null,
    userId: row.user_id ?? null,
    email: row.email ?? null
  }
}
