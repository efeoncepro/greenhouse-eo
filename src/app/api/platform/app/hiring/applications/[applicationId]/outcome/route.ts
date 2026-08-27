import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppHiringApplicationOutcome } from '@/lib/api-platform/resources/app-hiring-application-decision'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.hiring.application.outcome.get',
    handler: async context => ({
      data: await getAppHiringApplicationOutcome({ context, applicationId: (await params).applicationId })
    })
  })
}
