import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppGlobeCreditFundingOperations } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.operations.list',
    handler: async context => ({ data: await listAppGlobeCreditFundingOperations({ context, request }) })
  })
}
