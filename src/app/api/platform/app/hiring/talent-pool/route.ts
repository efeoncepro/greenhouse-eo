import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { searchAppTalentPool } from '@/lib/api-platform/resources/app-hiring-talent-pool'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.hiring.talent_pool.search',
    handler: async context => ({ data: await searchAppTalentPool({ context, request }) })
  })
}
