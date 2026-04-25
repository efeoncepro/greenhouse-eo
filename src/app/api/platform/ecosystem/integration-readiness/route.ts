import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemIntegrationReadiness } from '@/lib/api-platform/resources/integration-readiness'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.integration-readiness',
    handler: async () => ({
      data: await getEcosystemIntegrationReadiness(request)
    })
  })
}
