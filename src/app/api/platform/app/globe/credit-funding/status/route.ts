import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppGlobeCreditCapacityStatus } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.status',
    handler: async context => ({ data: await getAppGlobeCreditCapacityStatus({ context, request }) })
  })
}
