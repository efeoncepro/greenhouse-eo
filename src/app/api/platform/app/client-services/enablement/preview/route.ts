import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { runAppClientServiceEnablement } from '@/lib/api-platform/resources/app-client-service-enablement'

export const dynamic = 'force-dynamic'

// The domain command owns atomic idempotency; the route wrapper supplies auth and request audit.
export async function POST(request: Request) {
  return runAppRoute({
    request,
    routeKey: 'platform.app.client_services.enablement.preview',
    handler: async context => runAppClientServiceEnablement({
      context, operation: 'preview', body: await request.json().catch(() => null)
    })
  })
}
