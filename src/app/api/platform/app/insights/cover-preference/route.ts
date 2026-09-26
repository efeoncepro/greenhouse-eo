import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { setAppInsightCoverPreference } from '@/lib/api-platform/resources/app-insights'
import { getAppInsightCoverPreference } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1888 — portada preferida de los informes de la organización: leer (GET) y fijar `auto|dark|light` (POST). */
export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.insights.cover_preference.get', handler: async context => getAppInsightCoverPreference({ context, request }) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.cover_preference.set', body, handler: async context => setAppInsightCoverPreference({ context, request, body }) })
}
