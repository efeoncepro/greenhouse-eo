import 'server-only'

import { NotificationService } from '@/lib/notifications/notification-service'

import type { HomeTodayInboxData, TodayInboxItem, TodayInboxKind, TodayInboxSeverity } from '../contract'
import type { HomeLoaderContext } from '../registry'

/**
 * Today Inbox loader — Linear-Inbox shape.
 *
 * Today, the data source is `NotificationService.getNotifications` (the
 * Notification Hub). As Slice 2 lands we extend with:
 *   - `projection_refresh_queue` items in dead/error
 *   - `outbox` items requiring action
 *   - approvals (HR leaves, expense reports)
 *   - period_closure_status when readiness < 100% near deadline
 *
 * Each composer-level extension goes through a `withSourceTimeout`
 * guard so a slow secondary source can't poison the inbox render.
 */

const NOTIFICATION_KIND_MAP: Record<string, TodayInboxKind> = {
  approval: 'approval',
  approvals: 'approval',
  closing: 'closing',
  sla: 'sla_breach',
  sync: 'sync_drift',
  drift: 'sync_drift',
  mention: 'mention',
  reminder: 'reminder',
  task: 'task',
  incident: 'incident'
}

const inferKind = (category: string | null | undefined, fallback: TodayInboxKind = 'reminder'): TodayInboxKind => {
  if (!category) return fallback
  const normalized = category.toLowerCase()

  for (const [needle, kind] of Object.entries(NOTIFICATION_KIND_MAP)) {
    if (normalized.includes(needle)) return kind
  }

  return fallback
}

const inferSeverity = (priority: string | null | undefined): TodayInboxSeverity => {
  if (!priority) return 'info'
  const normalized = String(priority).toLowerCase()

  if (normalized === 'critical' || normalized === 'high') return 'critical'
  if (normalized === 'warning' || normalized === 'medium') return 'warning'

  return 'info'
}

const buildActions = (kind: TodayInboxKind): TodayInboxItem['actions'] => {
  if (kind === 'approval') {
    return [
      { actionId: 'approve', label: 'Aprobar', primary: true },
      { actionId: 'dismiss', label: 'Rechazar' }
    ]
  }

  if (kind === 'closing' || kind === 'sla_breach' || kind === 'sync_drift' || kind === 'incident') {
    return [
      { actionId: 'open', label: 'Abrir', primary: true },
      { actionId: 'snooze', label: 'Posponer' }
    ]
  }

  return [
    { actionId: 'open', label: 'Ver', primary: true },
    { actionId: 'dismiss', label: 'Descartar' }
  ]
}

export const loadHomeTodayInbox = async (ctx: HomeLoaderContext): Promise<HomeTodayInboxData> => {
  const result = await NotificationService.getNotifications(ctx.userId, {
    unreadOnly: true,
    pageSize: 8
  }).catch(error => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[home.loaders.inbox] NotificationService failed:',
        error instanceof Error ? error.message : error
      )
    }

    return { items: [], total: 0 } as Awaited<ReturnType<typeof NotificationService.getNotifications>>
  })

  const items: TodayInboxItem[] = result.items.map(notification => {
    const kind = inferKind(notification.category)
    const severity = inferSeverity((notification.metadata?.priority as string | undefined) ?? null)

    return {
      itemId: notification.notification_id,
      kind,
      severity,
      title: notification.title,
      description: notification.body ?? null,
      href: notification.action_url ?? null,
      dueAt: (notification.metadata?.dueDate as string | undefined) ?? null,
      origin: notification.category ?? 'notification',
      actions: buildActions(kind),
      createdAt: typeof notification.created_at === 'string'
        ? notification.created_at
        : new Date(notification.created_at as unknown as number).toISOString()
    }
  })

  const groupCounts = items.reduce<Partial<Record<TodayInboxKind, number>>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1

    return acc
  }, {})

  return {
    items,
    totalUnread: result.total,
    groupCounts,
    fetchedAt: ctx.now
  }
}
