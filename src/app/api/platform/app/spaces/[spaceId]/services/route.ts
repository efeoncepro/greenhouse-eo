import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { listAppSpaceServices } from '@/lib/api-platform/resources/app-spaces'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.spaces.services.list',
    handler: async context => listAppSpaceServices({ context, request, spaceId })
  })
}
