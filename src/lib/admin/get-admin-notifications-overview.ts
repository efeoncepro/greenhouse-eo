import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { NOTIFICATION_CATEGORIES, type NotificationCategoryConfig } from '@/config/notification-categories'

// ── Types ──

export interface NotificationKpis {
  totalSent24h: number
  inAppDelivered24h: number
  emailDelivered24h: number
  failed24h: number
  skipped24h: number
}

export interface ChannelHealth {
  sent: number
  failed: number
  rate: number
}

export interface DeliveryHealth {
  inApp: ChannelHealth
  email: ChannelHealth
  lastSignalAt: string | null
}

export interface NotificationCategoryRow {
  code: string
  label: string
  description: string
  audience: string
  defaultChannels: string[]
  priority: string
  icon: string
}

export interface DispatchLogRow {
  logId: string
  userId: string
  category: string
  channel: string
  status: string
  skipReason: string | null
  errorMessage: string | null
  createdAt: string
}

export interface AdminNotificationsOverview {
  kpis: NotificationKpis
  deliveryHealth: DeliveryHealth
  categories: NotificationCategoryRow[]
  recentDispatch: DispatchLogRow[]
}

// ── Helpers ──

type CountRow = Record<string, unknown> & { count: string | number }

const safeCount = async (query: string, params?: unknown[]): Promise<number> => {
  try {
    const rows = await runGreenhousePostgresQuery<CountRow>(query, params)

    return Number(rows[0]?.count ?? 0)
  } catch {
    return 0
  }
}

const tableExists = async (schema: string, table: string): Promise<boolean> => {
  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown> & { exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2) AS exists`,
      [schema, table]
    )

    return rows[0]?.exists === true
  } catch {
    return false
  }
}

// ── Categories (static, from config) ──

const buildCategories = (): NotificationCategoryRow[] =>
  Object.values(NOTIFICATION_CATEGORIES).map((c: NotificationCategoryConfig) => ({
    code: c.code,
    label: c.label,
    description: c.description,
    audience: c.audience,
    defaultChannels: [...c.defaultChannels],
    priority: c.priority,
    icon: c.icon
  }))

// ── Main ──

export const getAdminNotificationsOverview = async (): Promise<AdminNotificationsOverview> => {
  const hasLog = await tableExists('greenhouse_notifications', 'notification_log')

  if (!hasLog) {
    return {
      kpis: { totalSent24h: 0, inAppDelivered24h: 0, emailDelivered24h: 0, failed24h: 0, skipped24h: 0 },
      deliveryHealth: { inApp: { sent: 0, failed: 0, rate: 0 }, email: { sent: 0, failed: 0, rate: 0 }, lastSignalAt: null },
      categories: buildCategories(),
      recentDispatch: []
    }
  }

  // ── KPIs (24h) ──

  const [totalSent24h, inAppDelivered24h, emailDelivered24h, failed24h, skipped24h] = await Promise.all([
    safeCount(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notification_log
       WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours'`
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notification_log
       WHERE status = 'sent' AND channel = 'in_app' AND created_at > NOW() - INTERVAL '24 hours'`
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notification_log
       WHERE status = 'sent' AND channel = 'email' AND created_at > NOW() - INTERVAL '24 hours'`
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notification_log
       WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'`
    ),
    safeCount(
      `SELECT COUNT(*) AS count FROM greenhouse_notifications.notification_log
       WHERE status = 'skipped' AND created_at > NOW() - INTERVAL '24 hours'`
    )
  ])

  // ── Delivery health per channel ──

  type ChannelStatsRow = Record<string, unknown> & { channel: string; sent: string | number; failed: string | number }

  let inAppHealth: ChannelHealth = { sent: 0, failed: 0, rate: 0 }
  let emailHealth: ChannelHealth = { sent: 0, failed: 0, rate: 0 }

  try {
    const channelRows = await runGreenhousePostgresQuery<ChannelStatsRow>(
      `SELECT
         channel,
         COUNT(*) FILTER (WHERE status = 'sent') AS sent,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed
       FROM greenhouse_notifications.notification_log
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY channel`
    )

    for (const row of channelRows) {
      const sent = Number(row.sent ?? 0)
      const failed = Number(row.failed ?? 0)
      const total = sent + failed
      const rate = total > 0 ? Math.round((sent / total) * 1000) / 10 : 0

      if (row.channel === 'in_app') inAppHealth = { sent, failed, rate }
      if (row.channel === 'email') emailHealth = { sent, failed, rate }
    }
  } catch {
    // Keep defaults
  }

  // ── Last signal ──

  let lastSignalAt: string | null = null

  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown> & { last_signal: string | null }>(
      `SELECT MAX(created_at)::text AS last_signal FROM greenhouse_notifications.notification_log`
    )

    lastSignalAt = rows[0]?.last_signal ?? null
  } catch {
    // Keep null
  }

  // ── Recent dispatch (last 50) ──

  let recentDispatch: DispatchLogRow[] = []

  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown> & {
      log_id: string
      user_id: string
      category: string
      channel: string
      status: string
      skip_reason: string | null
      error_message: string | null
      created_at: string
    }>(
      `SELECT log_id::text, user_id, category, channel, status, skip_reason, error_message, created_at::text
       FROM greenhouse_notifications.notification_log
       ORDER BY created_at DESC
       LIMIT 50`
    )

    recentDispatch = rows.map(r => ({
      logId: String(r.log_id),
      userId: String(r.user_id),
      category: String(r.category),
      channel: String(r.channel),
      status: String(r.status),
      skipReason: r.skip_reason ?? null,
      errorMessage: r.error_message ?? null,
      createdAt: String(r.created_at)
    }))
  } catch {
    // Keep empty
  }

  return {
    kpis: { totalSent24h, inAppDelivered24h, emailDelivered24h, failed24h, skipped24h },
    deliveryHealth: { inApp: inAppHealth, email: emailHealth, lastSignalAt },
    categories: buildCategories(),
    recentDispatch
  }
}
