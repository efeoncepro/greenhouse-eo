import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { cancelAppInsightDelivery } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ deliveryIntentId: string }> }) {
  const { deliveryIntentId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.deliveries.cancel', body, handler: async context => cancelAppInsightDelivery({ context, request, body, deliveryIntentId }) })
}
