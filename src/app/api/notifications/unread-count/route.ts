import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { NotificationService } from '@/lib/notifications/notification-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await NotificationService.getUnreadCount(tenant.userId)

    return NextResponse.json({ unreadCount: count })
  } catch (error) {
    console.error('GET /api/notifications/unread-count failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
