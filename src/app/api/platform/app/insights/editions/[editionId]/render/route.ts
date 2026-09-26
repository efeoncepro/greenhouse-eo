import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { requestAppInsightRender } from '@/lib/api-platform/resources/app-insights'
import { listAppInsightRenderRuns } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

/** TASK-1846 — encola el render de una edición (202) o devuelve el run vivo (200, idempotente). */
export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.editions.render', body, handler: async context => requestAppInsightRender({ context, request, body, editionId }) })
}

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.editions.render.list', handler: async context => listAppInsightRenderRuns({ context, request, editionId }) })
}
