import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightRenderRunPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ renderRunId: string }> }) {
  const { renderRunId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.render_runs.get', handler: async context => getEcosystemInsightRenderRunPayload({ context, request, renderRunId }) })
}
