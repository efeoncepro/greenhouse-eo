import 'server-only'

import { getMemberNotificationRecipients, type PersonNotificationRecipient } from '@/lib/notifications/person-recipient-resolver'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface NotificationRecipient {
  identityProfileId?: string
  userId?: string
  memberId?: string
  email?: string
  fullName?: string
}

export interface RecipientResolutionResult {
  recipients: NotificationRecipient[]
  unresolvedRecipients: number
}

interface RecipientRow extends Record<string, unknown> {
  identity_profile_id?: string | null
  member_id?: string | null
  user_id?: string | null
  email?: string | null
  full_name?: string | null
}

const normalizeRecipient = (row: RecipientRow): NotificationRecipient | null => {
  const userId = typeof row.user_id === 'string' && row.user_id.trim() ? row.user_id.trim() : undefined
  const email = typeof row.email === 'string' && row.email.trim() ? row.email.trim() : undefined
  const fullName = typeof row.full_name === 'string' && row.full_name.trim() ? row.full_name.trim() : undefined

  if (!userId && !email) return null

  return {
    ...(typeof row.identity_profile_id === 'string' && row.identity_profile_id.trim()
      ? { identityProfileId: row.identity_profile_id.trim() }
      : {}),
    ...(typeof row.member_id === 'string' && row.member_id.trim() ? { memberId: row.member_id.trim() } : {}),
    ...(userId ? { userId } : {}),
    ...(email ? { email } : {}),
    ...(fullName ? { fullName } : {})
  }
}

const toNotificationRecipient = (recipient: PersonNotificationRecipient | null): NotificationRecipient | null =>
  recipient
    ? {
        ...(recipient.identityProfileId ? { identityProfileId: recipient.identityProfileId } : {}),
        ...(recipient.memberId ? { memberId: recipient.memberId } : {}),
        ...(recipient.userId ? { userId: recipient.userId } : {}),
        ...(recipient.email ? { email: recipient.email } : {}),
        ...(recipient.fullName ? { fullName: recipient.fullName } : {})
      }
    : null

export const getMemberRecipient = async (memberId: string): Promise<RecipientResolutionResult> => {
  const recipientsByMemberId = await getMemberNotificationRecipients([memberId])
  const recipient = toNotificationRecipient(recipientsByMemberId.get(memberId) ?? null)

  if (!recipient) {
    return { recipients: [], unresolvedRecipients: 0 }
  }

  return {
    recipients: [recipient],
    unresolvedRecipients: 0
  }
}

export const getPayrollPeriodRecipients = async (periodId: string): Promise<RecipientResolutionResult> => {
  const rows = await runGreenhousePostgresQuery<{ member_id: string } & Record<string, unknown>>(
    `SELECT DISTINCT
       e.member_id
     FROM greenhouse_payroll.payroll_entries AS e
     INNER JOIN greenhouse_core.members AS m
       ON m.member_id = e.member_id
     WHERE e.period_id = $1
       AND m.active = TRUE
     ORDER BY e.member_id ASC`,
    [periodId]
  )

  const recipientsByMemberId = await getMemberNotificationRecipients(rows.map(row => row.member_id))
  const recipients: NotificationRecipient[] = []
  let unresolvedRecipients = 0

  for (const row of rows) {
    const recipient = toNotificationRecipient(recipientsByMemberId.get(row.member_id) ?? null)

    if (recipient) {
      recipients.push(recipient)
    } else {
      unresolvedRecipients += 1
    }
  }

  return { recipients, unresolvedRecipients }
}

export const getHrAdminRecipients = async (): Promise<RecipientResolutionResult> => {
  const rows = await runGreenhousePostgresQuery<RecipientRow>(
    `SELECT DISTINCT
       identity_profile_id,
       member_id,
       user_id,
       email,
       full_name
     FROM greenhouse_serving.session_360
     WHERE active = TRUE
       AND status = 'active'
       AND (
         role_codes @> ARRAY['hr_manager']::text[]
         OR role_codes @> ARRAY['efeonce_admin']::text[]
       )
     ORDER BY full_name ASC NULLS LAST, email ASC NULLS LAST`
  )

  return {
    recipients: rows.map(normalizeRecipient).filter((value): value is NotificationRecipient => value !== null),
    unresolvedRecipients: 0
  }
}
