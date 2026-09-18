import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightDeliveryPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ deliveryIntentId: string }> }) {
  const { deliveryIntentId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.deliveries.get', handler: async context => getEcosystemInsightDeliveryPayload({ context, request, deliveryIntentId }) })
}
