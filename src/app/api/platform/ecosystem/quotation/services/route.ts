import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemQuotationServicesPayload } from '@/lib/api-platform/resources/ecosystem-quotation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.quotation.services',
    handler: async context => getEcosystemQuotationServicesPayload({ context, request })
  })
}
