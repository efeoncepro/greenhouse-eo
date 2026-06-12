import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppKnowledgeDocumentsPayload } from '@/lib/api-platform/resources/app-knowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.knowledge.documents',
    handler: async context => ({
      data: await getAppKnowledgeDocumentsPayload({ context, request })
    })
  })
}
