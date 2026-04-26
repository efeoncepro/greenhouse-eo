import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { listEventTypes } from '@/lib/api-platform/resources/events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.event-types.list',
    handler: async () => ({
      data: await listEventTypes({ request })
    })
  })
}
