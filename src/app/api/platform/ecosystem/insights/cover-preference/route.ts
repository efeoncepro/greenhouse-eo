import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { setEcosystemInsightCoverPreferencePayload } from '@/lib/api-platform/resources/ecosystem-insights'
import { getEcosystemInsightCoverPreferencePayload } from '@/lib/api-platform/resources/ecosystem-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1888 — portada preferida por el lane ecosystem (gateway MCP). Fijarla exige un binding interno. */
export async function GET(request: Request) {
  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.cover_preference.get', handler: async context => getEcosystemInsightCoverPreferencePayload({ context, request }) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.cover_preference.set', body, handler: async context => setEcosystemInsightCoverPreferencePayload({ context, request, body }) })
}
