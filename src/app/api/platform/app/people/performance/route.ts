import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppMemberPerformancePayload } from '@/lib/api-platform/resources/app-people'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.people.performance',
    handler: async context => ({
      data: await getAppMemberPerformancePayload({ context, request })
    })
  })
}
