import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { buildAppContextPayload } from '@/lib/api-platform/resources/app'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.context',
    handler: async context => ({
      data: buildAppContextPayload(context)
    })
  })
}
