import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { EmailPriority } from './types'

const DEFAULT_LIMIT_PER_HOUR = 10

interface CountRow {
  cnt: string
}

/**
 * Checks whether a recipient is within the hourly email rate limit.
 *
 * - critical / transactional emails bypass rate limits completely (always allowed).
 * - broadcast emails check the per-recipient hourly limit (default: 10/hour).
 */
export const checkRecipientRateLimit = async (
  recipientEmail: string,
  limit = DEFAULT_LIMIT_PER_HOUR,
  priority?: EmailPriority
): Promise<{ allowed: boolean; currentCount: number }> => {
  // Priority bypass: critical and transactional emails always pass
  if (priority === 'critical' || priority === 'transactional') {
    return { allowed: true, currentCount: 0 }
  }

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
