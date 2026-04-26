import { buildApiPlatformPaginationMeta } from '@/lib/api-platform/core/pagination'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { createWebhookSubscription, listWebhookSubscriptions } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-subscriptions.list',
    handler: async context => {
      const payload = await listWebhookSubscriptions({
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-subscriptions.create',
    handler: async context => ({
      data: await createWebhookSubscription({
        context,
        body
      }),
      status: 201
    })
  })
}
