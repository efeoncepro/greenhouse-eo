import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoKeywordMarketDataPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_market_data',
    handler: async context =>
      getEcosystemSeoKeywordMarketDataPayload({
        context,
        request
      })
  })
}
