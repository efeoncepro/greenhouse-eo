import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { retireEcosystemSeoCompetitorsPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1662 — `POST /api/platform/ecosystem/growth/seo/competitors/retire`
 *
 * El reverso del declare: cierra la vigencia (append-only) y corta el gasto de cobertura
 * del próximo ciclo. Mismo boundary de scope `internal` que el alta.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.competitors.retire',
    body,
    handler: async context =>
      retireEcosystemSeoCompetitorsPayload({
        context,
        request,
        body
      })
  })
}
