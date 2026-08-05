import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { previewAppGlobeCreditFunding } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppReadRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.preview',
    handler: async context => ({ data: await previewAppGlobeCreditFunding({ context, body }) })
  })
}
