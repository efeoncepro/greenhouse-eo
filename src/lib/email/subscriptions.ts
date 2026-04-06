import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { EmailRecipient } from './types'

interface SubscriptionRow {
  recipient_email: string
  recipient_name: string | null
  recipient_user_id: string | null
}

export const getSubscribers = async (emailType: string): Promise<EmailRecipient[]> => {
  const rows = await runGreenhousePostgresQuery<SubscriptionRow & Record<string, unknown>>(
    `
      SELECT recipient_email, recipient_name, recipient_user_id
      FROM greenhouse_notifications.email_subscriptions
      WHERE email_type = $1 AND active = TRUE
      ORDER BY created_at ASC, recipient_email ASC
    `,
    [emailType]
  )

  return rows.map(row => ({
    email: row.recipient_email,
    name: row.recipient_name ?? undefined,
    userId: row.recipient_user_id ?? undefined
  }))
}

export const addSubscriber = async (params: {
  emailType: string
  recipientEmail: string
  recipientName?: string | null
  recipientUserId?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_notifications.email_subscriptions
        (email_type, recipient_email, recipient_name, recipient_user_id, active, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      ON CONFLICT (email_type, recipient_email) DO UPDATE SET
        recipient_name = EXCLUDED.recipient_name,
        recipient_user_id = EXCLUDED.recipient_user_id,
        active = TRUE,
        updated_at = NOW()
    `,
    [
      params.emailType,
      params.recipientEmail.trim().toLowerCase(),
      params.recipientName ?? null,
      params.recipientUserId ?? null
    ]
  )
}

export const removeSubscriber = async (params: {
  emailType: string
  recipientEmail: string
}) => {
  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_notifications.email_subscriptions
      SET active = FALSE, updated_at = NOW()
      WHERE email_type = $1 AND recipient_email = $2
    `,
    [params.emailType, params.recipientEmail.trim().toLowerCase()]
  )
}
