import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppAuthorizedSpaces } from '@/lib/api-platform/resources/app-spaces'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.spaces.list', handler: async context => listAppAuthorizedSpaces({ context, request }) })
}
