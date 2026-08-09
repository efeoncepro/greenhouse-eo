import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { untrackEcosystemSeoKeywordsPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1308 — `POST /api/platform/ecosystem/growth/seo/keywords/untrack`
 *
 * Segundo command del lane SEO. Igual que el alta va por `runEcosystemCommandRoute` y no por
 * el helper de lectura: necesita idempotencia por `Idempotency-Key` y auditoría de ejecución
 * — un reintento del transporte no puede volver a cerrar ventanas ya cerradas.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keywords.untrack',
    body,
    handler: async context =>
      untrackEcosystemSeoKeywordsPayload({
        context,
        request,
        body
      })
  })
}
