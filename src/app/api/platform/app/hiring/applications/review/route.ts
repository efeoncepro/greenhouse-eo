import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppCandidateReviewApplications } from '@/lib/api-platform/resources/app-hiring-candidate-review'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.hiring.applications.review.list',
    handler: async context => ({ data: await listAppCandidateReviewApplications({ context, request }) })
  })
}
