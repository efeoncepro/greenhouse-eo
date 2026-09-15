import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightsCatalogPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.catalog', handler: async context => getEcosystemInsightsCatalogPayload({ context, request }) })
}
