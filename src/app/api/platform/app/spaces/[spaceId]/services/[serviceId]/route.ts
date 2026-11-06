import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppSpaceService } from '@/lib/api-platform/resources/app-spaces'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ spaceId: string; serviceId: string }> }) {
  const { spaceId, serviceId } = await params

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.spaces.services.get',
    handler: async context => getAppSpaceService({ context, request, spaceId, serviceId })
  })
}
