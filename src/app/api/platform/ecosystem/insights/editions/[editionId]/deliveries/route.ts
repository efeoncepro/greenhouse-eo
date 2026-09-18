import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEcosystemInsightDeliveriesPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

/** TASK-1848 — lectura de envíos por el lane ecosystem (solicitarlos exige una persona en el App lane). */
export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.editions.deliveries.list', handler: async context => listEcosystemInsightDeliveriesPayload({ context, request, editionId }) })
}
