import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { retryWebhookDelivery } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-deliveries.retry',
    handler: async platformContext => ({
      data: await retryWebhookDelivery({
        context: platformContext,
        deliveryId: id
      })
    })
  })
}
