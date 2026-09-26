import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightEditionPayload } from '@/lib/api-platform/resources/ecosystem-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.editions.get', handler: async context => getEcosystemInsightEditionPayload({ context, request, editionId }) })
}
