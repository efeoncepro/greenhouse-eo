import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightRenderRun } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ renderRunId: string }> }) {
  const { renderRunId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.render_runs.get', handler: async context => ({ data: await getAppInsightRenderRun({ context, request, renderRunId }) }) })
}
