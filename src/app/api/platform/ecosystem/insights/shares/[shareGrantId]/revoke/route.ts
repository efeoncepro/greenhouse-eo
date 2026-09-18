import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { revokeEcosystemInsightSharePayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ shareGrantId: string }> }) {
  const { shareGrantId } = await params
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.shares.revoke', body, handler: async context => revokeEcosystemInsightSharePayload({ context, request, body, shareGrantId }) })
}
