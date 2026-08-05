import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoKeywordOpportunitiesPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_opportunities',
    handler: async context =>
      getEcosystemSeoKeywordOpportunitiesPayload({
        context,
        request
      })
  })
}
