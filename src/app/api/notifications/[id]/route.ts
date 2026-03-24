import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { NotificationService } from '@/lib/notifications/notification-service'

export const dynamic = 'force-dynamic'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    await NotificationService.markAsRead(id, tenant.userId)

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error('PATCH /api/notifications/[id] failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
