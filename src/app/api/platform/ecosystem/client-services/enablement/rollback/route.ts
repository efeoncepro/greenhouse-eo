import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { runEcosystemClientServiceEnablement } from '@/lib/api-platform/resources/ecosystem-client-service-enablement'

export const dynamic = 'force-dynamic'

// The domain command owns atomic idempotency; the route wrapper supplies auth and request audit.
export async function POST(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.client_services.enablement.rollback',
    handler: async context => runEcosystemClientServiceEnablement({
      context, operation: 'rollback', body: await request.json().catch(() => null)
    })
  })
}
