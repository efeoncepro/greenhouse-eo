import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { runAppCommercialTermsDeclare, runAppCommercialTermsRead } from '@/lib/api-platform/resources/app-commercial-terms'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ serviceId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { serviceId } = await params

  return runAppRoute({
    request,
    routeKey: 'platform.app.commercial.services.terms.read',
    handler: async context => runAppCommercialTermsRead({ context, serviceId })
  })
}

// The domain writer owns the transaction, the single-active-terms invariant and the audit/outbox pair.
export async function POST(request: Request, { params }: Params) {
  const { serviceId } = await params

  return runAppRoute({
    request,
    routeKey: 'platform.app.commercial.services.terms.declare',
    handler: async context => runAppCommercialTermsDeclare({
      context, serviceId, body: await request.json().catch(() => null)
    })
  })
}
