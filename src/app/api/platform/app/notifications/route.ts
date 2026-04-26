import { buildApiPlatformPaginationMeta } from '@/lib/api-platform/core/pagination'
import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppNotifications } from '@/lib/api-platform/resources/app'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.notifications.list',
    handler: async context => {
      const payload = await listAppNotifications({ context, request })

      return {
        data: {
          items: payload.items
        },
        meta: {
          pagination: buildApiPlatformPaginationMeta({
            page: payload.page,
            pageSize: payload.pageSize,
            total: payload.total,
            count: payload.items.length
          })
        }
      }
    }
  })
}
