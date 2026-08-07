import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoPerformancePayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1307 — rendimiento en el tiempo de un SET de keywords o URLs (pantalla ancla).
 * Lane machine-authed del ecosystem: org por binding (org-scoped manda, internal exige
 * `organizationId`), entitlement per-org `seo_v1` con 404 anti-oracle. Passthrough del
 * reader canónico `readSeoPerformance` — la MISMA lectura que consume la UI.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.performance',
    handler: async context => getEcosystemSeoPerformancePayload({ context, request })
  })
}
