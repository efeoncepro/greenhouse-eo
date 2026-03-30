import 'server-only'

import {
  getMemberNotificationRecipients,
  getRoleCodeNotificationRecipients,
  type PersonNotificationRecipient
} from '@/lib/notifications/person-recipient-resolver'
import { getCanonicalPersonByUserId } from '@/lib/identity/canonical-person'
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

const toResolutionResult = (recipients: NotificationRecipient[]): RecipientResolutionResult => ({
  recipients,
  unresolvedRecipients: 0
})

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

export const getUserRecipient = async (userId: string): Promise<RecipientResolutionResult> => {
  const person = await getCanonicalPersonByUserId(userId)

  const recipient = person
    ? toNotificationRecipient({
        identityProfileId: person.identityProfileId ?? undefined,
        memberId: person.memberId ?? undefined,
        userId: person.userId ?? undefined,
        email: person.portalEmail ?? person.canonicalEmail ?? person.memberEmail ?? undefined,
        fullName: person.portalDisplayName ?? person.displayName ?? undefined
      })
    : null

  return {
    recipients: recipient ? [recipient] : [],
    unresolvedRecipients: recipient ? 0 : 1
  }
}

export const getHrAdminRecipients = async (): Promise<RecipientResolutionResult> => {
  return toResolutionResult(
    (await getRoleCodeNotificationRecipients(['hr_manager', 'efeonce_admin']))
      .map(toNotificationRecipient)
      .filter((value): value is NotificationRecipient => value !== null)
  )
}

export const getFinanceAdminRecipients = async (): Promise<RecipientResolutionResult> => {
  return toResolutionResult(
    (await getRoleCodeNotificationRecipients(['finance_manager', 'efeonce_admin']))
      .map(toNotificationRecipient)
      .filter((value): value is NotificationRecipient => value !== null)
  )
}
