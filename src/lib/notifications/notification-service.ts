import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getCategoryConfig, type NotificationChannel } from '@/config/notification-categories'
import { isResendConfigured, getResendClient, getEmailFromAddress } from '@/lib/resend'

// ── Types ──────────────────────────────────────────────────────

export interface DispatchInput {
  category: string
  recipients: {
    userId: string
    email?: string
    fullName?: string
  }[]
  spaceId?: string
  title: string
  body?: string
  actionUrl?: string
  icon?: string
  metadata?: Record<string, unknown>
}

export interface DispatchResult {
  sent: { userId: string; channels: NotificationChannel[] }[]
  skipped: { userId: string; reason: string }[]
  failed: { userId: string; channel: NotificationChannel; error: string }[]
}

interface PreferenceRow extends Record<string, unknown> {
  in_app_enabled: boolean
  email_enabled: boolean
  muted_until: string | null
}

interface NotificationRow extends Record<string, unknown> {
  notification_id: string
  user_id: string
  space_id: string | null
  category: string
  title: string
  body: string | null
  action_url: string | null
  icon: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  archived_at: string | null
  created_at: string
}

interface CountRow extends Record<string, unknown> {
  count: string | number
}

// ── Service ────────────────────────────────────────────────────

export class NotificationService {
  static async dispatch(input: DispatchInput): Promise<DispatchResult> {
    const categoryConfig = getCategoryConfig(input.category)
    const result: DispatchResult = { sent: [], skipped: [], failed: [] }

    for (const recipient of input.recipients) {
      const channels = await this.resolveChannels(
        recipient.userId,
        input.category,
        categoryConfig.defaultChannels
      )

      if (channels.length === 0) {
        result.skipped.push({ userId: recipient.userId, reason: 'all_channels_disabled' })
        await this.logDispatch(null, recipient.userId, input.category, 'in_app', 'skipped', 'all_channels_disabled')
        continue
      }

      const sentChannels: NotificationChannel[] = []

      // ── In-app channel ──
      if (channels.includes('in_app')) {
        try {
          const notificationId = await this.createInAppNotification(input, recipient.userId, categoryConfig.icon)

          sentChannels.push('in_app')
          await this.logDispatch(notificationId, recipient.userId, input.category, 'in_app', 'sent')
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'

          result.failed.push({ userId: recipient.userId, channel: 'in_app', error: msg })
          await this.logDispatch(null, recipient.userId, input.category, 'in_app', 'failed', undefined, msg)
        }
      }

      // ── Email channel ──
      if (channels.includes('email') && recipient.email) {
        try {
          await this.sendEmailNotification(input, recipient)
          sentChannels.push('email')
          await this.logDispatch(null, recipient.userId, input.category, 'email', 'sent')
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'

          result.failed.push({ userId: recipient.userId, channel: 'email', error: msg })
          await this.logDispatch(null, recipient.userId, input.category, 'email', 'failed', undefined, msg)
        }
      } else if (channels.includes('email') && !recipient.email) {
        result.skipped.push({ userId: recipient.userId, reason: 'email_not_provided' })
      }

      if (sentChannels.length > 0) {
        result.sent.push({ userId: recipient.userId, channels: sentChannels })
      }
    }

    return result
  }

  private static async resolveChannels(
    userId: string,
    category: string,
    defaults: readonly NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    const rows = await runGreenhousePostgresQuery<PreferenceRow>(
      `SELECT in_app_enabled, email_enabled, muted_until
       FROM greenhouse_notifications.notification_preferences
       WHERE user_id = $1 AND category = $2`,
      [userId, category]
    )

    // No preference row = use defaults
    if (rows.length === 0) return [...defaults]

    const pref = rows[0]

    // Check muted
    if (pref.muted_until && new Date(pref.muted_until) > new Date()) {
      return []
    }

    const channels: NotificationChannel[] = []

    if (pref.in_app_enabled) channels.push('in_app')
    if (pref.email_enabled) channels.push('email')

    return channels
  }

  private static async createInAppNotification(
    input: DispatchInput,
    userId: string,
    defaultIcon: string
  ): Promise<string> {
    const rows = await runGreenhousePostgresQuery<{ notification_id: string } & Record<string, unknown>>(
      `INSERT INTO greenhouse_notifications.notifications
         (user_id, space_id, category, title, body, action_url, icon, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING notification_id`,
      [
        userId,
        input.spaceId || null,
        input.category,
        input.title,
        input.body || null,
        input.actionUrl || null,
        input.icon || defaultIcon,
        JSON.stringify(input.metadata || {})
      ]
    )

    return rows[0].notification_id
  }

  private static async sendEmailNotification(
    input: DispatchInput,
    recipient: { userId: string; email?: string; fullName?: string }
  ): Promise<void> {
    if (!isResendConfigured() || !recipient.email) return

    const resend = getResendClient()

    await resend.emails.send({
      from: getEmailFromAddress(),
      to: recipient.email,
      subject: input.title,
      text: [
        recipient.fullName ? `Hola ${recipient.fullName},` : 'Hola,',
        '',
        input.body || input.title,
        '',
        input.actionUrl ? `Ver más: ${input.actionUrl}` : '',
        '',
        '— Greenhouse by Efeonce Group'
      ].filter(Boolean).join('\n')
    })
  }

  private static async logDispatch(
    notificationId: string | null,
    userId: string,
    category: string,
    channel: NotificationChannel,
    status: 'sent' | 'skipped' | 'failed',
    skipReason?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_notifications.notification_log
           (notification_id, user_id, category, channel, status, skip_reason, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [notificationId, userId, category, channel, status, skipReason || null, errorMessage || null]
      )
    } catch {
      // Log dispatch failure is non-blocking
    }
  }

  // ── Read operations ──────────────────────────────────

  static async getNotifications(
    userId: string,
    options: { unreadOnly?: boolean; category?: string; page?: number; pageSize?: number } = {}
  ): Promise<{ items: NotificationRow[]; total: number }> {
    const { unreadOnly = false, category, page = 1, pageSize = 20 } = options
    const params: unknown[] = [userId]
    let filters = 'WHERE user_id = $1 AND archived_at IS NULL'
    let paramIndex = 2

    if (unreadOnly) {
      filters += ' AND read_at IS NULL'
    }

    if (category) {
      filters += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    const countRows = await runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notifications ${filters}`,
      params
    )

    const total = Number(countRows[0]?.count ?? 0)
    const offset = (page - 1) * pageSize

    const items = await runGreenhousePostgresQuery<NotificationRow>(
      `SELECT notification_id, user_id, space_id, category, title, body,
              action_url, icon, metadata, read_at, archived_at, created_at
       FROM greenhouse_notifications.notifications
       ${filters}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    )

    return { items, total }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const rows = await runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*) AS count
       FROM greenhouse_notifications.notifications
       WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL`,
      [userId]
    )

    return Number(rows[0]?.count ?? 0)
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_notifications.notifications
       SET read_at = NOW()
       WHERE notification_id = $1 AND user_id = $2 AND read_at IS NULL`,
      [notificationId, userId]
    )
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const rows = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `WITH updated AS (
         UPDATE greenhouse_notifications.notifications
         SET read_at = NOW()
         WHERE user_id = $1 AND read_at IS NULL AND archived_at IS NULL
         RETURNING 1
       )
       SELECT COUNT(*) AS count FROM updated`,
      [userId]
    )

    return Number(rows[0]?.count ?? 0)
  }

  // ── Preferences ──────────────────────────────────────

  static async getPreferences(userId: string): Promise<PreferenceRow[]> {
    return runGreenhousePostgresQuery<PreferenceRow>(
      `SELECT category, in_app_enabled, email_enabled, muted_until
       FROM greenhouse_notifications.notification_preferences
       WHERE user_id = $1
       ORDER BY category`,
      [userId]
    )
  }

  static async upsertPreference(
    userId: string,
    category: string,
    inAppEnabled: boolean,
    emailEnabled: boolean
  ): Promise<void> {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_notifications.notification_preferences
         (user_id, category, in_app_enabled, email_enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, category) DO UPDATE SET
         in_app_enabled = EXCLUDED.in_app_enabled,
         email_enabled = EXCLUDED.email_enabled,
         updated_at = NOW()`,
      [userId, category, inAppEnabled, emailEnabled]
    )
  }
}
