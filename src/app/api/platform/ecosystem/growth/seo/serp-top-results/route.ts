import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoSerpTopResultsPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1699 — `GET /api/platform/ecosystem/growth/seo/serp-top-results`
 *
 * Serie fechada del top-N del SERP ya pagado. Sólo bindings `internal` sin organización,
 * 404 anti-oracle: es dato competitivo del cliente (§7) y no cruza el boundary de org.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.serp_top_results',
    handler: context => getEcosystemSeoSerpTopResultsPayload({ context, request })
  })
}
