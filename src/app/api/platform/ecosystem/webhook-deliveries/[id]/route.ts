import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getWebhookDelivery } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-deliveries.detail',
    handler: async platformContext => ({
      data: await getWebhookDelivery({
        context: platformContext,
        deliveryId: id
      })
    })
  })
}
