import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { buildEcosystemContextPayload } from '@/lib/api-platform/resources/context'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.context',
    handler: async context => ({
      data: buildEcosystemContextPayload(context)
    })
  })
}
