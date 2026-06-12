import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemKnowledgeSearchPayload } from '@/lib/api-platform/resources/ecosystem-knowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.knowledge.search',
    handler: async context =>
      getEcosystemKnowledgeSearchPayload({
        context,
        request
      })
  })
}
