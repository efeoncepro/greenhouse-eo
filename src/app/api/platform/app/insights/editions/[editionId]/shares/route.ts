import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { createAppInsightShare, listAppInsightShares } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

/** TASK-1848 — crea un enlace compartido (201; el token sólo viaja en esta respuesta) o lista los de la edición. */
export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.editions.shares.create', body, handler: async context => createAppInsightShare({ context, request, body, editionId }) })
}

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.editions.shares.list', handler: async context => listAppInsightShares({ context, request, editionId }) })
}
