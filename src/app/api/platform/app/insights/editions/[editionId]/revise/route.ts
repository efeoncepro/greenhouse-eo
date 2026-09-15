import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { reviseAppInsightEdition } from '@/lib/api-platform/resources/app-insights'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.insights.editions.revise', body, handler: async context => reviseAppInsightEdition({ context, request, body, editionId }) })
}
