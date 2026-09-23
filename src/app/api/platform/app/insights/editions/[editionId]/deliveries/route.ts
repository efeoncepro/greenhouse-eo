import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { requestAppInsightDelivery } from '@/lib/api-platform/resources/app-insights'
import { listAppInsightDeliveries } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1848 — autoriza un envío por correo (202; se despacha en el worker) o lista los de la edición. */
export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.editions.deliveries.request', body, handler: async context => requestAppInsightDelivery({ context, request, body, editionId }) })
}

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.editions.deliveries.list', handler: async context => listAppInsightDeliveries({ context, request, editionId }) })
}
