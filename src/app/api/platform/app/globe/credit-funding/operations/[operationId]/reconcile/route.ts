import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { reconcileAppGlobeCreditFundingOperation } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ operationId: string }> }) {
  const [{ operationId }, body] = await Promise.all([params, request.json().catch(() => undefined)])

  return runAppCommandRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.operations.reconcile',
    body,
    handler: async context => ({
      data: await reconcileAppGlobeCreditFundingOperation({ context, request, operationId, body })
    })
  })
}
