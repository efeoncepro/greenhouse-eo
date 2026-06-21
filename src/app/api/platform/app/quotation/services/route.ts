import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppQuotationServicesPayload } from '@/lib/api-platform/resources/app-quotation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runAppReadRoute({
    request,
    routeKey: 'platform.app.quotation.services',
    handler: async context => ({
      data: await getAppQuotationServicesPayload({ context, request })
    })
  })
}
