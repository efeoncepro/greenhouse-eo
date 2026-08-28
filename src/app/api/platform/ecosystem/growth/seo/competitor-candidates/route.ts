import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoCompetitorCandidatesPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1699 — `GET /api/platform/ecosystem/growth/seo/competitor-candidates`
 *
 * El *propose* del loop de competidores: candidatos por recurrencia medida en el top-N,
 * con su evidencia y su `proposalRef` sugerido. El *execute* es `declare_seo_competitors`
 * (TASK-1662), que sólo se invoca tras confirmación humana. Sólo bindings `internal` sin
 * organización, 404 anti-oracle (§7).
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.competitor_candidates',
    handler: context => getEcosystemSeoCompetitorCandidatesPayload({ context, request })
  })
}
