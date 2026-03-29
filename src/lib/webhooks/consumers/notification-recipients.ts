import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface NotificationRecipient {
  userId: string
  email?: string
  fullName?: string
}

export interface RecipientResolutionResult {
  recipients: NotificationRecipient[]
  unresolvedRecipients: number
}

interface RecipientRow extends Record<string, unknown> {
  member_id?: string | null
  user_id?: string | null
  email?: string | null
  full_name?: string | null
}

const normalizeRecipient = (row: RecipientRow): NotificationRecipient | null => {
  const userId = typeof row.user_id === 'string' ? row.user_id.trim() : ''

  if (!userId) return null

  const email = typeof row.email === 'string' && row.email.trim() ? row.email.trim() : undefined
  const fullName = typeof row.full_name === 'string' && row.full_name.trim() ? row.full_name.trim() : undefined

  return {
    userId,
    ...(email ? { email } : {}),
    ...(fullName ? { fullName } : {})
  }
}

export const getMemberRecipient = async (memberId: string): Promise<RecipientResolutionResult> => {
  const rows = await runGreenhousePostgresQuery<RecipientRow>(
    `SELECT
       m.member_id,
       cu.user_id,
       cu.email,
       COALESCE(cu.full_name, m.display_name) AS full_name
     FROM greenhouse_core.members AS m
     LEFT JOIN greenhouse_core.client_users AS cu
       ON cu.member_id = m.member_id
      AND cu.active = TRUE
      AND cu.status = 'active'
     WHERE m.member_id = $1
       AND m.active = TRUE
     LIMIT 1`,
    [memberId]
  )

  if (rows.length === 0) {
    return { recipients: [], unresolvedRecipients: 0 }
  }

  const recipient = normalizeRecipient(rows[0])

  return {
    recipients: recipient ? [recipient] : [],
    unresolvedRecipients: recipient ? 0 : 1
  }
}

export const getPayrollPeriodRecipients = async (periodId: string): Promise<RecipientResolutionResult> => {
  const rows = await runGreenhousePostgresQuery<RecipientRow>(
    `SELECT DISTINCT
       e.member_id,
       cu.user_id,
       cu.email,
       COALESCE(cu.full_name, m.display_name) AS full_name
     FROM greenhouse_payroll.payroll_entries AS e
     INNER JOIN greenhouse_core.members AS m
       ON m.member_id = e.member_id
     LEFT JOIN greenhouse_core.client_users AS cu
       ON cu.member_id = m.member_id
      AND cu.active = TRUE
      AND cu.status = 'active'
     WHERE e.period_id = $1
       AND m.active = TRUE
     ORDER BY full_name ASC NULLS LAST, cu.email ASC NULLS LAST`,
    [periodId]
  )

  const recipients: NotificationRecipient[] = []
  let unresolvedRecipients = 0

  for (const row of rows) {
    const recipient = normalizeRecipient(row)

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
