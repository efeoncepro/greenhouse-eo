import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface PersonNotificationRecipient {
  identityProfileId?: string
  memberId?: string
  userId?: string
  email?: string
  fullName?: string
}

export interface PersonRecipientFallback {
  email?: string
  fullName?: string
}

interface MemberRecipientRow extends Record<string, unknown> {
  member_id: string
  identity_profile_id: string | null
  display_name: string | null
  primary_email: string | null
  canonical_email: string | null
  profile_full_name: string | null
  user_id: string | null
  client_user_email: string | null
  client_user_full_name: string | null
}

interface ProfileRecipientRow extends Record<string, unknown> {
  profile_id: string
  member_id: string | null
  display_name: string | null
  primary_email: string | null
  canonical_email: string | null
  profile_full_name: string | null
  user_id: string | null
  client_user_email: string | null
  client_user_full_name: string | null
}

const normalizeOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const toFallbackMap = (fallbacks?: Record<string, PersonRecipientFallback>) =>
  new Map(Object.entries(fallbacks ?? {}))

const buildRecipient = (
  params: {
    identityProfileId?: string
    memberId?: string
    userId?: string
    email?: string
    fullName?: string
  },
  fallback?: PersonRecipientFallback
): PersonNotificationRecipient | null => {
  const identityProfileId = normalizeOptionalString(params.identityProfileId)
  const memberId = normalizeOptionalString(params.memberId)
  const userId = normalizeOptionalString(params.userId)
  const email = normalizeOptionalString(params.email) ?? normalizeOptionalString(fallback?.email)
  const fullName = normalizeOptionalString(params.fullName) ?? normalizeOptionalString(fallback?.fullName)

  if (!userId && !email) {
    return null
  }

  return {
    ...(identityProfileId ? { identityProfileId } : {}),
    ...(memberId ? { memberId } : {}),
    ...(userId ? { userId } : {}),
    ...(email ? { email } : {}),
    ...(fullName ? { fullName } : {})
  }
}

export const getMemberNotificationRecipients = async (
  memberIds: string[],
  options?: { fallbacks?: Record<string, PersonRecipientFallback> }
) => {
  const uniqueMemberIds = Array.from(new Set(memberIds.map(memberId => memberId.trim()).filter(Boolean)))

  if (uniqueMemberIds.length === 0) {
    return new Map<string, PersonNotificationRecipient | null>()
  }

  const rows = await runGreenhousePostgresQuery<MemberRecipientRow>(
    `SELECT
       m.member_id,
       m.identity_profile_id,
       m.display_name,
       m.primary_email,
       ip.canonical_email,
       ip.full_name AS profile_full_name,
       cu.user_id,
       cu.email AS client_user_email,
       cu.full_name AS client_user_full_name
     FROM greenhouse_core.members AS m
     LEFT JOIN greenhouse_core.identity_profiles AS ip
       ON ip.profile_id = m.identity_profile_id
     LEFT JOIN LATERAL (
       SELECT cu.user_id, cu.email, cu.full_name
       FROM greenhouse_core.client_users AS cu
       WHERE cu.active = TRUE
         AND cu.status = 'active'
         AND (
           cu.member_id = m.member_id
           OR (m.identity_profile_id IS NOT NULL AND cu.identity_profile_id = m.identity_profile_id)
         )
       ORDER BY
         CASE WHEN cu.member_id = m.member_id THEN 0 ELSE 1 END,
         cu.email ASC NULLS LAST
       LIMIT 1
     ) AS cu ON TRUE
     WHERE m.active = TRUE
       AND m.member_id = ANY($1::text[])
     ORDER BY m.member_id ASC`,
    [uniqueMemberIds]
  )

  const rowByMemberId = new Map(rows.map(row => [row.member_id, row]))
  const fallbackByMemberId = toFallbackMap(options?.fallbacks)
  const recipientsByMemberId = new Map<string, PersonNotificationRecipient | null>()

  for (const memberId of uniqueMemberIds) {
    const row = rowByMemberId.get(memberId)

    recipientsByMemberId.set(
      memberId,
      buildRecipient(
        {
          identityProfileId: row?.identity_profile_id ?? undefined,
          memberId,
          userId: row?.user_id ?? undefined,
          email: row?.client_user_email ?? row?.canonical_email ?? row?.primary_email ?? undefined,
          fullName: row?.client_user_full_name ?? row?.profile_full_name ?? row?.display_name ?? undefined
        },
        fallbackByMemberId.get(memberId)
      )
    )
  }

  return recipientsByMemberId
}

export const getIdentityProfileNotificationRecipients = async (
  profileIds: string[],
  options?: { fallbacks?: Record<string, PersonRecipientFallback> }
) => {
  const uniqueProfileIds = Array.from(new Set(profileIds.map(profileId => profileId.trim()).filter(Boolean)))

  if (uniqueProfileIds.length === 0) {
    return new Map<string, PersonNotificationRecipient | null>()
  }

  const rows = await runGreenhousePostgresQuery<ProfileRecipientRow>(
    `SELECT
       ip.profile_id,
       m.member_id,
       m.display_name,
       m.primary_email,
       ip.canonical_email,
       ip.full_name AS profile_full_name,
       cu.user_id,
       cu.email AS client_user_email,
       cu.full_name AS client_user_full_name
     FROM greenhouse_core.identity_profiles AS ip
     LEFT JOIN greenhouse_core.members AS m
       ON m.identity_profile_id = ip.profile_id
      AND m.active = TRUE
     LEFT JOIN LATERAL (
       SELECT cu.user_id, cu.email, cu.full_name
       FROM greenhouse_core.client_users AS cu
       WHERE cu.active = TRUE
         AND cu.status = 'active'
         AND cu.identity_profile_id = ip.profile_id
       ORDER BY
         CASE WHEN m.member_id IS NOT NULL AND cu.member_id = m.member_id THEN 0 ELSE 1 END,
         cu.email ASC NULLS LAST
       LIMIT 1
     ) AS cu ON TRUE
     WHERE ip.profile_id = ANY($1::text[])
     ORDER BY ip.profile_id ASC`,
    [uniqueProfileIds]
  )

  const rowByProfileId = new Map<string, ProfileRecipientRow>()

  for (const row of rows) {
    if (!rowByProfileId.has(row.profile_id)) {
      rowByProfileId.set(row.profile_id, row)
    }
  }

  const fallbackByProfileId = toFallbackMap(options?.fallbacks)
  const recipientsByProfileId = new Map<string, PersonNotificationRecipient | null>()

  for (const profileId of uniqueProfileIds) {
    const row = rowByProfileId.get(profileId)

    recipientsByProfileId.set(
      profileId,
      buildRecipient(
        {
          identityProfileId: profileId,
          memberId: row?.member_id ?? undefined,
          userId: row?.user_id ?? undefined,
          email: row?.client_user_email ?? row?.canonical_email ?? row?.primary_email ?? undefined,
          fullName: row?.client_user_full_name ?? row?.profile_full_name ?? row?.display_name ?? undefined
        },
        fallbackByProfileId.get(profileId)
      )
    )
  }

  return recipientsByProfileId
}

export const getProfileNotificationRecipient = async (
  profileId: string,
  fallback?: PersonRecipientFallback
) => {
  const recipientsByProfileId = await getIdentityProfileNotificationRecipients([profileId], {
    ...(fallback ? { fallbacks: { [profileId]: fallback } } : {})
  })

  return recipientsByProfileId.get(profileId) ?? null
}

export const getUserNotificationRecipient = async (
  userId: string,
  fallback?: PersonRecipientFallback
) => {
  const normalizedUserId = userId.trim()

  if (!normalizedUserId) {
    return null
  }

  const rows = await runGreenhousePostgresQuery<ProfileRecipientRow>(
    `SELECT
       COALESCE(cu.identity_profile_id, m.identity_profile_id) AS profile_id,
       COALESCE(cu.member_id, m.member_id) AS member_id,
       m.display_name,
       m.primary_email,
       ip.canonical_email,
       ip.full_name AS profile_full_name,
       cu.user_id,
       cu.email AS client_user_email,
       cu.full_name AS client_user_full_name
     FROM greenhouse_core.client_users AS cu
     LEFT JOIN greenhouse_core.identity_profiles AS ip
       ON ip.profile_id = cu.identity_profile_id
     LEFT JOIN greenhouse_core.members AS m
       ON (
         (cu.member_id IS NOT NULL AND m.member_id = cu.member_id)
         OR (
           cu.identity_profile_id IS NOT NULL
           AND m.identity_profile_id = cu.identity_profile_id
         )
       )
      AND m.active = TRUE
     WHERE cu.user_id = $1
       AND cu.active = TRUE
       AND cu.status = 'active'
     ORDER BY
       CASE
         WHEN cu.member_id IS NOT NULL AND m.member_id = cu.member_id THEN 0
         WHEN cu.identity_profile_id IS NOT NULL AND m.identity_profile_id = cu.identity_profile_id THEN 1
         ELSE 2
       END
     LIMIT 1`,
    [normalizedUserId]
  )

  const row = rows[0]

  return buildRecipient(
    {
      identityProfileId: row?.profile_id ?? undefined,
      memberId: row?.member_id ?? undefined,
      userId: row?.user_id ?? normalizedUserId,
      email: row?.client_user_email ?? row?.canonical_email ?? row?.primary_email ?? undefined,
      fullName: row?.client_user_full_name ?? row?.profile_full_name ?? row?.display_name ?? undefined
    },
    fallback
  )
}

export const resolveNotificationRecipients = async (
  recipients: PersonNotificationRecipient[]
): Promise<PersonNotificationRecipient[]> => {
  const resolved = await Promise.all(
    recipients.map(async recipient => {
      if (recipient.identityProfileId) {
        return getProfileNotificationRecipient(recipient.identityProfileId, {
          email: recipient.email,
          fullName: recipient.fullName
        })
      }

      if (recipient.memberId) {
        return (await getMemberNotificationRecipients([recipient.memberId], {
          fallbacks: {
            [recipient.memberId]: {
              email: recipient.email,
              fullName: recipient.fullName
            }
          }
        })).get(recipient.memberId) ?? null
      }

      if (recipient.userId) {
        return getUserNotificationRecipient(recipient.userId, {
          email: recipient.email,
          fullName: recipient.fullName
        })
      }

      return buildRecipient({
        email: recipient.email,
        fullName: recipient.fullName
      })
    })
  )

  return resolved.filter((recipient): recipient is PersonNotificationRecipient => recipient !== null)
}
