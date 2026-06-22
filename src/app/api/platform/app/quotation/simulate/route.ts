import { runAppRoute } from '@/lib/api-platform/core/app-auth'
import { simulateAppQuotationPayload } from '@/lib/api-platform/resources/app-quotation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return runAppRoute({
    request,
    routeKey: 'platform.app.quotation.simulate',
    handler: async context => ({
      data: await simulateAppQuotationPayload({ context, request })
    })
  })
}
