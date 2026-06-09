import 'server-only'

import { createHash } from 'node:crypto'

import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Coming Soon launch-waitlist capture (route /coming-soon).
 *
 * Server-only. Idempotent by normalized email (ON CONFLICT DO NOTHING):
 * - first capture        → inserts + emits `launch.notification.subscribed` v1
 * - repeat (same email)  → no-op, returns `already_subscribed`, NO event
 *
 * Anonymous abuse is gated by an IP-window rate limit (count rows by
 * `request_ip_hash`). The IP is hashed (SHA-256) — the raw IP is never stored
 * or logged (PII hygiene). The outbox payload carries NO PII (only the row id +
 * locale + source); the future "we launched" notify flow reads the email from
 * the table by id.
 */

/** Max captures per IP per window before throttling (generous — real signups). */
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60

/** Email shape mirror of the DB CHECK constraint. */
export const LAUNCH_NOTIFY_EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type LaunchNotifySource = 'public' | 'internal'

export interface SubscribeLaunchNotificationInput {
  email: string
  locale: string
  source: LaunchNotifySource
  userId?: string | null
  requestIp?: string | null
}

export type SubscribeLaunchNotificationResult = {
  status: 'created' | 'already_subscribed'
}

export class LaunchNotifyRateLimitError extends Error {
  readonly code = 'LAUNCH_NOTIFY_RATE_LIMITED'
  readonly retryAfterSeconds = RATE_LIMIT_WINDOW_SECONDS

  constructor() {
    super('Launch notify rate limit exceeded.')
    this.name = 'LaunchNotifyRateLimitError'
  }
}

export const normalizeLaunchNotifyEmail = (raw: string): string => raw.trim().toLowerCase()

export const isValidLaunchNotifyEmail = (email: string): boolean =>
  email.length <= 320 && LAUNCH_NOTIFY_EMAIL_REGEX.test(email)

/** SHA-256 of the client IP. Returns null when no IP is resolvable. */
export const hashRequestIp = (ip: string | null | undefined): string | null => {
  const trimmed = ip?.trim()

  if (!trimmed) {
    return null
  }

  return createHash('sha256').update(trimmed).digest('hex')
}

/**
 * Throttle by IP window. No-op when the IP is unknown (cannot key on it) — the
 * email UNIQUE constraint still makes repeats idempotent.
 */
export const enforceLaunchNotifyRateLimit = async (requestIpHash: string | null): Promise<void> => {
  if (!requestIpHash) {
    return
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()

  const rows = await runGreenhousePostgresQuery<{ request_count: string }>(
    `SELECT COUNT(*)::text AS request_count
       FROM greenhouse_core.launch_notifications
      WHERE request_ip_hash = $1 AND created_at > $2`,
    [requestIpHash, since]
  )

  if (Number(rows[0]?.request_count ?? 0) >= RATE_LIMIT_MAX) {
    throw new LaunchNotifyRateLimitError()
  }
}

/**
 * Persist a launch-notify subscription (idempotent) and emit the outbox event
 * on first capture, atomically.
 */
export const subscribeLaunchNotification = async (
  input: SubscribeLaunchNotificationInput
): Promise<SubscribeLaunchNotificationResult> => {
  const email = normalizeLaunchNotifyEmail(input.email)
  const requestIpHash = hashRequestIp(input.requestIp)

  return withGreenhousePostgresTransaction(async client => {
    const result = await client.query(
      `INSERT INTO greenhouse_core.launch_notifications
         (email, locale, source, user_id, request_ip_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING notification_id`,
      [email, input.locale, input.source, input.userId ?? null, requestIpHash]
    )

    const insertedId = (result.rows?.[0] as { notification_id?: string } | undefined)?.notification_id

    if (!insertedId) {
      // Idempotent: email already on the list. No event re-emitted.
      return { status: 'already_subscribed' }
    }

    // PII-free payload — the notify flow reads the email from PG by id.
    await publishOutboxEvent(
      {
        aggregateType: 'launch_notification',
        aggregateId: insertedId,
        eventType: EVENT_TYPES.launchNotificationSubscribed,
        payload: {
          schemaVersion: 1,
          notificationId: insertedId,
          locale: input.locale,
          source: input.source,
          hasUserId: Boolean(input.userId)
        }
      },
      client
    )

    return { status: 'created' }
  })
}
