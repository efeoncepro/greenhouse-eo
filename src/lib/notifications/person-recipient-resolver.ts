import 'server-only'

import {
  getCanonicalPersonByUserId,
  getCanonicalPersonsByIdentityProfileIds,
  getCanonicalPersonsByMemberIds,
} from '@/lib/identity/canonical-person'
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

interface SessionRecipientRow extends Record<string, unknown> {
  identity_profile_id: string | null
  member_id: string | null
  user_id: string | null
  email: string | null
  full_name: string | null
}

const normalizeOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const toFallbackMap = (fallbacks?: Record<string, PersonRecipientFallback>) =>
  new Map(Object.entries(fallbacks ?? {}))

const buildRecipientResolutionKey = (recipient: PersonNotificationRecipient) =>
  recipient.userId
  ?? (recipient.identityProfileId ? `person:${recipient.identityProfileId}` : null)
  ?? (recipient.memberId ? `member:${recipient.memberId}` : null)
  ?? (recipient.email ? `external:${recipient.email.trim().toLowerCase()}` : null)

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

  const peopleByMemberId = await getCanonicalPersonsByMemberIds(uniqueMemberIds)
  const fallbackByMemberId = toFallbackMap(options?.fallbacks)
  const recipientsByMemberId = new Map<string, PersonNotificationRecipient | null>()

  for (const memberId of uniqueMemberIds) {
    const person = peopleByMemberId.get(memberId)

    recipientsByMemberId.set(
      memberId,
      buildRecipient(
        {
          identityProfileId: person?.identityProfileId ?? undefined,
          memberId,
          userId: person?.userId ?? undefined,
          email: person?.portalEmail ?? person?.canonicalEmail ?? person?.memberEmail ?? undefined,
          fullName: person?.portalDisplayName ?? person?.displayName ?? undefined
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

  const peopleByProfileId = await getCanonicalPersonsByIdentityProfileIds(uniqueProfileIds)
  const fallbackByProfileId = toFallbackMap(options?.fallbacks)
  const recipientsByProfileId = new Map<string, PersonNotificationRecipient | null>()

  for (const profileId of uniqueProfileIds) {
    const person = peopleByProfileId.get(profileId)

    recipientsByProfileId.set(
      profileId,
      buildRecipient(
        {
          identityProfileId: profileId,
          memberId: person?.memberId ?? undefined,
          userId: person?.userId ?? undefined,
          email: person?.portalEmail ?? person?.canonicalEmail ?? person?.memberEmail ?? undefined,
          fullName: person?.portalDisplayName ?? person?.displayName ?? undefined
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

  const person = await getCanonicalPersonByUserId(normalizedUserId)

  return buildRecipient(
    {
      identityProfileId: person?.identityProfileId ?? undefined,
      memberId: person?.memberId ?? undefined,
      userId: person?.userId ?? normalizedUserId,
      email: person?.portalEmail ?? person?.canonicalEmail ?? person?.memberEmail ?? undefined,
      fullName: person?.portalDisplayName ?? person?.displayName ?? undefined
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

export const getRoleCodeNotificationRecipients = async (
  roleCodes: string[]
): Promise<PersonNotificationRecipient[]> => {
  const normalizedRoleCodes = Array.from(new Set(roleCodes.map(roleCode => roleCode.trim()).filter(Boolean)))

  if (normalizedRoleCodes.length === 0) {
    return []
  }

  const rows = await runGreenhousePostgresQuery<SessionRecipientRow>(
    `SELECT DISTINCT
       identity_profile_id,
       member_id,
       user_id,
       email,
       full_name
     FROM greenhouse_serving.session_360
     WHERE active = TRUE
       AND status = 'active'
       AND role_codes && $1::text[]
     ORDER BY full_name ASC NULLS LAST, email ASC NULLS LAST`,
    [normalizedRoleCodes]
  )

  const dedupedRecipients = new Map<string, PersonNotificationRecipient>()

  for (const row of rows) {
    const recipient = buildRecipient({
      identityProfileId: row.identity_profile_id ?? undefined,
      memberId: row.member_id ?? undefined,
      userId: row.user_id ?? undefined,
      email: row.email ?? undefined,
      fullName: row.full_name ?? undefined
    })

    if (!recipient) {
      continue
    }

    const recipientKey = buildRecipientResolutionKey(recipient)

    if (!recipientKey || dedupedRecipients.has(recipientKey)) {
      continue
    }

    dedupedRecipients.set(recipientKey, recipient)
  }

  return [...dedupedRecipients.values()]
}
