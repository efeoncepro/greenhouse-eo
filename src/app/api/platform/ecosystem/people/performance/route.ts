import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemMemberPerformancePayload } from '@/lib/api-platform/resources/ecosystem-people'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.people.performance',
    handler: async context => getEcosystemMemberPerformancePayload({ context, request })
  })
}
