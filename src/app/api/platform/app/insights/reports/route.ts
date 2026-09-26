import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppInsightReports } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.insights.reports.list', handler: async context => listAppInsightReports({ context, request }) })
}
