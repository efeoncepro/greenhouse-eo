import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'

export const dynamic = 'force-dynamic'

const shouldFallbackUnreadCount = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  return (
    message.includes('permission denied') ||
    message.includes('not authorized') ||
    message.includes('greenhouse_notifications')
  )
}

export async function GET() {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureNotificationSchema()
    const count = await NotificationService.getUnreadCount(tenant.userId)

    return NextResponse.json({ unreadCount: count })
  } catch (error) {
    if (shouldFallbackUnreadCount(error)) {
      console.warn('GET /api/notifications/unread-count fallback to 0 due to notifications store access issue:', error)

      return NextResponse.json({ unreadCount: 0 })
    }

    console.error('GET /api/notifications/unread-count failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
