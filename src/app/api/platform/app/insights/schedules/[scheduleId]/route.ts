import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightSchedule } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.schedules.get', handler: async context => getAppInsightSchedule({ context, request, scheduleId }) })
}
