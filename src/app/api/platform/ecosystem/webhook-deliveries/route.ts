import { buildApiPlatformPaginationMeta } from '@/lib/api-platform/core/pagination'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listWebhookDeliveries } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-deliveries.list',
    handler: async context => {
      const payload = await listWebhookDeliveries({
        context,
        request
      })

      return {
        data: {
          count: payload.count,
          items: payload.items
        },
        meta: {
          pagination: buildApiPlatformPaginationMeta({
            page: payload.page,
            pageSize: payload.pageSize,
            total: payload.total
          })
        }
      }
    }
  })
}
