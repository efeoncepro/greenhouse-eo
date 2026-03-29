import 'server-only'

import { randomUUID } from 'crypto'

import { getBigQueryClient } from '@/lib/bigquery'

interface EmailLogEntry {
  email_to: string
  email_type: 'password_reset' | 'invitation' | 'verification'
  user_id?: string
  client_id?: string
  status: 'sent' | 'failed' | 'bounced'
  resend_id?: string
  error_message?: string
}

/**
 * @deprecated Use `src/lib/email/delivery.ts` and `greenhouse_notifications.email_deliveries`.
 */
export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const bq = getBigQueryClient()

    await bq
      .dataset('greenhouse')
      .table('email_logs')
      .insert([{
        log_id: randomUUID(),
        ...entry,
        sent_at: new Date().toISOString()
      }])
  } catch (error) {
    // Logging failure must never break the email flow
    console.error('[email-log] Failed to log email event:', error)
  }
}
