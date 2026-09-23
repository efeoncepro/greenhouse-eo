import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppInsightEdition } from '@/lib/api-platform/resources/app-insights-read'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.insights.editions.get', handler: async context => ({ data: await getAppInsightEdition({ context, request, editionId }) }) })
}
