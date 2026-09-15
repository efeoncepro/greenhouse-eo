import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightReport } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.reports.get', handler: async context => ({ data: await getAppInsightReport({ context, request, reportId }) }) })
}
