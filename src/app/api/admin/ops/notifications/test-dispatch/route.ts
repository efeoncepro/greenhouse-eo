import { NextResponse } from 'next/server'

import { NotificationService } from '@/lib/notifications/notification-service'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await NotificationService.dispatch({
    category: 'system_event',
    recipients: [{
      userId: tenant.userId,
      email: undefined,
      fullName: undefined
    }],
    title: 'Notificación de prueba',
    body: 'Esta es una notificación de prueba enviada desde Admin Center para validar el pipeline.',
    actionUrl: '/admin/notifications',
    icon: 'tabler-test-pipe'
  })

  return NextResponse.json({
    dispatched: result.sent.length > 0,
    sent: result.sent.length,
    skipped: result.skipped.length,
    failed: result.failed.length
  })
}
