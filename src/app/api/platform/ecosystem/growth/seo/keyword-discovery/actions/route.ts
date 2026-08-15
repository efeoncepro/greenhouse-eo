import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { recordEcosystemSeoDiscoveryActionPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1664 — `POST /api/platform/ecosystem/growth/seo/keyword-discovery/actions`
 *
 * Acción append-only sobre un candidato (dismissed/selected/promoted/rejected). Es un log de
 * decisión, NUNCA un ejecutor: no llama `trackKeywords` ni escribe el set monitoreado. Sólo
 * bindings `internal`.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_discovery.action',
    body,
    handler: async context =>
      recordEcosystemSeoDiscoveryActionPayload({
        context,
        request,
        body
      })
  })
}
