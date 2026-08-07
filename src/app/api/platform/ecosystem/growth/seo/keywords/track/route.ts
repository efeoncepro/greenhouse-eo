import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { trackEcosystemSeoKeywordsPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1308 — `POST /api/platform/ecosystem/growth/seo/keywords/track`
 *
 * El primer COMMAND del lane SEO (todo lo anterior era lectura). Usa
 * `runEcosystemCommandRoute`, no el helper de lectura: un write necesita idempotencia por
 * `Idempotency-Key` y auditoría de ejecución — un reintento del gateway sobre un timeout de
 * red no puede volver a comprometer gasto.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keywords.track',
    body,
    handler: async context =>
      trackEcosystemSeoKeywordsPayload({
        context,
        request,
        body
      })
  })
}
