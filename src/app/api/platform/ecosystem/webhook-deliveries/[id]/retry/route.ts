import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { retryWebhookDelivery } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-deliveries.retry',
    body: { deliveryId: id },
    handler: async platformContext => ({
      data: await retryWebhookDelivery({
        context: platformContext,
        deliveryId: id
      })
    })
  })
}
