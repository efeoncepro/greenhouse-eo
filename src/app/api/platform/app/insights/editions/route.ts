import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { createAppInsightEdition } from '@/lib/api-platform/resources/app-insights'
import { listAppInsightEditions } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.insights.editions.list', handler: async context => listAppInsightEditions({ context, request }) })
}

/** createEdition: 202 con reportId/editionId; la generación corre por fases tras el commit. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.editions.create', body, handler: async context => createAppInsightEdition({ context, request, body }) })
}
