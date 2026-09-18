import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { retryAppInsightDelivery } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ deliveryIntentId: string }> }) {
  const { deliveryIntentId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.deliveries.retry', body, handler: async context => retryAppInsightDelivery({ context, request, body, deliveryIntentId }) })
}
