import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { submitAppKnowledgeFeedbackPayload } from '@/lib/api-platform/resources/app-knowledge'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return runAppRoute({
    request,
    routeKey: 'platform.app.knowledge.feedback',
    handler: async context => ({
      data: await submitAppKnowledgeFeedbackPayload({ context, request }),
      status: 201
    })
  })
}
