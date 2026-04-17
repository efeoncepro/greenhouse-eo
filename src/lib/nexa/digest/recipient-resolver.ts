import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import type { EmailRecipient } from '@/lib/email/types'
import { getInternalUsersFromPostgres } from '@/lib/tenant/identity-store'
import { getRoleCodeNotificationRecipients, type PersonNotificationRecipient } from '@/lib/notifications/person-recipient-resolver'

const WEEKLY_DIGEST_ROLE_CODES = [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.EFEONCE_OPERATIONS] as const

const normalizeKey = (value: string | null | undefined) => value?.trim().toLowerCase() || null

const toEmailRecipient = (recipient: PersonNotificationRecipient): EmailRecipient => ({
  email: recipient.email!.trim().toLowerCase(),
  ...(recipient.fullName ? { name: recipient.fullName } : {}),
  ...(recipient.userId ? { userId: recipient.userId } : {})
})

export const resolveWeeklyDigestRecipients = async (): Promise<EmailRecipient[]> => {
  const [candidates, internalUsers] = await Promise.all([
    getRoleCodeNotificationRecipients([...WEEKLY_DIGEST_ROLE_CODES]),
    getInternalUsersFromPostgres()
  ])

  if (candidates.length === 0) {
    return []
  }

  const internalKeys = new Set<string>()

  for (const row of internalUsers) {
    const userId = normalizeKey(row.user_id)
    const email = normalizeKey(row.email)
    const microsoftEmail = normalizeKey(row.microsoft_email)

    if (userId) internalKeys.add(userId)
    if (email) internalKeys.add(email)
    if (microsoftEmail) internalKeys.add(microsoftEmail)
  }

  const deduped = new Map<string, EmailRecipient>()

  for (const candidate of candidates) {
    if (!candidate.email) {
      continue
    }

    const candidateKeys = [
      normalizeKey(candidate.userId),
      normalizeKey(candidate.email)
    ].filter((value): value is string => Boolean(value))

    if (candidateKeys.length === 0) {
      continue
    }

    if (internalKeys.size > 0 && !candidateKeys.some(key => internalKeys.has(key))) {
      continue
    }

    const recipient = toEmailRecipient(candidate)
    const dedupeKey = recipient.userId?.trim() || recipient.email

    if (!dedupeKey || deduped.has(dedupeKey)) {
      continue
    }

    deduped.set(dedupeKey, recipient)
  }

  return [...deduped.values()]
}

export const WEEKLY_DIGEST_RECIPIENT_ROLES = WEEKLY_DIGEST_ROLE_CODES
