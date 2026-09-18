import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { transitionAppInsightSchedule } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.schedules.pause', body, handler: async context => transitionAppInsightSchedule({ context, request, body, scheduleId, action: 'pause' }) })
}
