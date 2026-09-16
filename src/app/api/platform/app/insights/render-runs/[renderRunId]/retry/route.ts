import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { retryAppInsightRender } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ renderRunId: string }> }) {
  const { renderRunId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.render_runs.retry', body, handler: async context => retryAppInsightRender({ context, request, body, renderRunId }) })
}
