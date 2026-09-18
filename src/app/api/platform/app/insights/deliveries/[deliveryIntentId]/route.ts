import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightDelivery } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

/** TASK-1848 — un envío con el estado por destinatario y el del transporte (aceptado ≠ entregado). */
export async function GET(request: Request, { params }: { params: Promise<{ deliveryIntentId: string }> }) {
  const { deliveryIntentId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.deliveries.get', handler: async context => getAppInsightDelivery({ context, request, deliveryIntentId }) })
}
