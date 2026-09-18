import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { revokeAppInsightShare } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

/** TASK-1848 — revoca un enlace compartido (idempotente; nunca se reactiva). */
export async function POST(request: Request, { params }: { params: Promise<{ shareGrantId: string }> }) {
  const { shareGrantId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.shares.revoke', body, handler: async context => revokeAppInsightShare({ context, request, body, shareGrantId }) })
}
