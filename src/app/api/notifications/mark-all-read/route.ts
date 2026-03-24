import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureNotificationSchema()
    const count = await NotificationService.markAllAsRead(tenant.userId)

    return NextResponse.json({ markedAsRead: count })
  } catch (error) {
    console.error('POST /api/notifications/mark-all-read failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
