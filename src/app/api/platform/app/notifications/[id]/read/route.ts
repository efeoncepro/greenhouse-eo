import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { NotificationService } from '@/lib/notifications/notification-service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return runAppRoute({
    request,
    routeKey: 'platform.app.notifications.read',
    handler: async context => {
      await NotificationService.markAsRead(id, context.tenant.userId)

      return {
        data: {
          notificationId: id,
          read: true
        }
      }
    }
  })
}
