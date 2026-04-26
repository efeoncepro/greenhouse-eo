import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getWebhookSubscription, updateWebhookSubscription } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-subscriptions.detail',
    handler: async platformContext => ({
      data: await getWebhookSubscription({
        context: platformContext,
        subscriptionId: id
      })
    })
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const body = await request.json().catch(() => null)

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.webhook-subscriptions.update',
    handler: async platformContext => ({
      data: await updateWebhookSubscription({
        context: platformContext,
        subscriptionId: id,
        body
      })
    })
  })
}
