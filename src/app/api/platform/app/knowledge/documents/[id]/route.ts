import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppKnowledgeDocumentDetailPayload } from '@/lib/api-platform/resources/app-knowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.knowledge.document_detail',
    handler: async context => ({
      data: await getAppKnowledgeDocumentDetailPayload({ context, documentId: id })
    })
  })
}
