import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { simulateEcosystemQuotationPayload } from '@/lib/api-platform/resources/ecosystem-quotation'

export const dynamic = 'force-dynamic'

// Read-only POST: simula (no persiste). Usa el READ helper, NO el command route.
export async function POST(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.quotation.simulate',
    handler: async context => simulateEcosystemQuotationPayload({ context, request })
  })
}
