import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemKnowledgeDocumentPayload } from '@/lib/api-platform/resources/ecosystem-knowledge'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.knowledge.document',
    handler: async context =>
      getEcosystemKnowledgeDocumentPayload({
        context,
        documentId: id
      })
  })
}
