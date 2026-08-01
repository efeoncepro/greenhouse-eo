import { runAppCommandRoute } from '@/lib/api-platform/core/app-auth'
import { confirmAppGlobeCreditFunding } from '@/lib/api-platform/resources/app-globe-credit-funding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({
    request,
    routeKey: 'platform.app.globe.credit_funding.confirm',
    body,
    handler: async context => ({ data: await confirmAppGlobeCreditFunding({ context, request, body }) })
  })
}
