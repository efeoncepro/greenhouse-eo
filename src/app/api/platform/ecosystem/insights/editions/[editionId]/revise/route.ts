import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { reviseEcosystemInsightEditionPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.editions.revise', body, handler: async context => reviseEcosystemInsightEditionPayload({ context, request, body, editionId }) })
}
