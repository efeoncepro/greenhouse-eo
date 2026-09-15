import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightsCatalog } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.insights.catalog', handler: async context => ({ data: await getAppInsightsCatalog({ context, request }) }) })
}
