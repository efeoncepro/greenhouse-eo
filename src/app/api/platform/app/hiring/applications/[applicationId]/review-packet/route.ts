import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppCandidateReviewPacket } from '@/lib/api-platform/resources/app-hiring-candidate-review'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.hiring.application.review_packet.get',
    handler: async context => ({
      data: await getAppCandidateReviewPacket({ context, request, applicationId: (await params).applicationId })
    })
  })
}
