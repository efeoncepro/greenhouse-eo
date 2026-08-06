import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoBacklinkProfilePayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1304 — Serie semanal del perfil de enlaces del target SEO de la organización
 * (referring domains, backlinks, rank 0–100, toxic share, new/lost). Lane machine-authed
 * del ecosystem: org por binding, entitlement per-org `seo_v1` con 404 anti-oracle.
 * Passthrough del reader canónico `readBacklinkProfile`.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.backlink_profile',
    handler: async context => getEcosystemSeoBacklinkProfilePayload({ context, request })
  })
}
