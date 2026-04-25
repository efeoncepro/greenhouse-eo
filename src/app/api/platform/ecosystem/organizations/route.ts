import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEcosystemOrganizations } from '@/lib/api-platform/resources/organizations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.organizations.list',
    handler: async context => ({
      data: await listEcosystemOrganizations({
        context,
        request
      })
    })
  })
}
