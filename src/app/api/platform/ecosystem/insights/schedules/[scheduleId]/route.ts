import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemInsightSchedulePayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.schedules.get', handler: async context => getEcosystemInsightSchedulePayload({ context, request, scheduleId }) })
}
