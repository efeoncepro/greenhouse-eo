import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { createAppInsightSchedule } from '@/lib/api-platform/resources/app-insights'
import { listAppInsightSchedules } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1848 — crea una recurrencia en borrador (201) o lista las de la organización. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.schedules.create', body, handler: async context => createAppInsightSchedule({ context, request, body }) })
}

export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.insights.schedules.list', handler: async context => listAppInsightSchedules({ context, request }) })
}
