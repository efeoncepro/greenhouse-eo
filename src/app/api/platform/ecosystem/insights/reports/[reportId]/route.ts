import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightReportPayload } from '@/lib/api-platform/resources/ecosystem-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.reports.get', handler: async context => getEcosystemInsightReportPayload({ context, request, reportId }) })
}
