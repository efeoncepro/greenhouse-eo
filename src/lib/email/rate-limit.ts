import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const DEFAULT_LIMIT_PER_HOUR = 10

interface CountRow {
  cnt: string
}

/**
 * Checks whether a recipient is within the hourly email rate limit.
 *
 * Counts sent/delivered emails to this recipient in the last hour.
 * Returns whether sending is allowed and the current count.
 */
export const checkRecipientRateLimit = async (
  recipientEmail: string,
  limit = DEFAULT_LIMIT_PER_HOUR
): Promise<{ allowed: boolean; currentCount: number }> => {
  const normalizedEmail = recipientEmail.trim().toLowerCase()

  const rows = await runGreenhousePostgresQuery<CountRow & Record<string, unknown>>(`
    SELECT COUNT(*)::text AS cnt
    FROM greenhouse_notifications.email_deliveries
    WHERE recipient_email = $1
      AND status IN ('sent', 'delivered')
      AND created_at > NOW() - INTERVAL '1 hour'
  `, [normalizedEmail])

  const currentCount = Number(rows[0]?.cnt ?? 0)

  return {
    allowed: currentCount < limit,
    currentCount
  }
}
