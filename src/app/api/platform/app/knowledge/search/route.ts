import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppKnowledgeSearchPayload } from '@/lib/api-platform/resources/app-knowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.knowledge.search',
    handler: async context => ({
      data: await getAppKnowledgeSearchPayload({ context, request })
    })
  })
}
