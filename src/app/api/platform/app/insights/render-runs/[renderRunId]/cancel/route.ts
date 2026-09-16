import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { cancelAppInsightRender } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ renderRunId: string }> }) {
  const { renderRunId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.render_runs.cancel', body, handler: async context => cancelAppInsightRender({ context, request, body, renderRunId }) })
}
