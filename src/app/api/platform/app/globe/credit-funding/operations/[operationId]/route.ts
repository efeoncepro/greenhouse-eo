import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppGlobeCreditFundingOperation } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.operations.get',
    handler: async context => ({ data: await getAppGlobeCreditFundingOperation({ context, request, operationId }) })
  })
}
