import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { previewAppOffboardingCaseReview } from '@/lib/api-platform/resources/app-hr-offboarding-case-review'

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>

  return runAppCommandRoute({
    request,
    routeKey: 'platform.app.hr.offboarding.case.review.preview',
    body,
    handler: async context => ({
      data: await previewAppOffboardingCaseReview({ context, caseId: (await params).caseId, body })
    })
  })
}
