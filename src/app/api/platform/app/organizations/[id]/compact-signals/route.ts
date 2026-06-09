import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppOrganizationCompactSignalsPayload } from '@/lib/api-platform/resources/app-organizations'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.organizations.compact_signals',
    handler: async context => ({
      data: await getAppOrganizationCompactSignalsPayload({
        context,
        request,
        organizationId: id,
        entrypointContext: 'agency'
      })
    })
  })
}
