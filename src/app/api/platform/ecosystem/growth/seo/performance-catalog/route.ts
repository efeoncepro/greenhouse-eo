import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoPerformanceCatalogPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1307 — catálogo de keywords/URLs elegibles para comparar (alimenta el selector de
 * set y le dice a un agente qué puede pedirle a `/performance`). Mismo gate del lane:
 * entitlement per-org `seo_v2` con 404 anti-oracle.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.performance_catalog',
    handler: async context => getEcosystemSeoPerformanceCatalogPayload({ context, request })
  })
}
