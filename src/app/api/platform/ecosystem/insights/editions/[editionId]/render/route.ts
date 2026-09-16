import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEcosystemInsightRenderRunsPayload, requestEcosystemInsightRenderPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.editions.render', body, handler: async context => requestEcosystemInsightRenderPayload({ context, request, body, editionId }) })
}

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.editions.render.list', handler: async context => listEcosystemInsightRenderRunsPayload({ context, request, editionId }) })
}
