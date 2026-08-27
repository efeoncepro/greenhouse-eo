import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { proposeAppHiringApplicationDecision } from '@/lib/api-platform/resources/app-hiring-application-decision'

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>

  return runAppCommandRoute({
    request,
    routeKey: 'platform.app.hiring.application.decision.propose',
    body,
    handler: async context => ({
      data: await proposeAppHiringApplicationDecision({ context, applicationId: (await params).applicationId, body })
    })
  })
}
