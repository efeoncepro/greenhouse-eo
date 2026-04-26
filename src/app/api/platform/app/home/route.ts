import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppHomePayload } from '@/lib/api-platform/resources/app'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.home',
    handler: async context => ({
      data: await getAppHomePayload(context)
    })
  })
}
