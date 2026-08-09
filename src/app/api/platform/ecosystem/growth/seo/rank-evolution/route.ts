import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoRankEvolutionPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1303 — Serie temporal de posiciones del target SEO de la organización
 * (rank evolution, DataForSEO). Lane machine-authed del ecosystem: org por binding
 * (org-scoped manda, internal exige `organizationId`), entitlement per-org `seo_v2`
 * con 404 anti-oracle. Passthrough del reader canónico `readRankEvolution`.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.rank_evolution',
    handler: async context => getEcosystemSeoRankEvolutionPayload({ context, request })
  })
}
