import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { NotificationService } from '@/lib/notifications/notification-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return runAppRoute({
    request,
    routeKey: 'platform.app.notifications.mark-all-read',
    handler: async context => ({
      data: {
        updatedCount: await NotificationService.markAllAsRead(context.tenant.userId)
      }
    })
  })
}
