import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEcosystemCapabilities } from '@/lib/api-platform/resources/capabilities'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.capabilities',
    handler: async context =>
      listEcosystemCapabilities({
        context,
        request
      })
  })
}
