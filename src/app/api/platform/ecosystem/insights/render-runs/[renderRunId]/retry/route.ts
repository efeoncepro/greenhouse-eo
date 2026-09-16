import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { retryEcosystemInsightRenderPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ renderRunId: string }> }) {
  const { renderRunId } = await params
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.render_runs.retry', body, handler: async context => retryEcosystemInsightRenderPayload({ context, request, body, renderRunId }) })
}
