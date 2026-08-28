import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { declareEcosystemSeoCompetitorsPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1662 — `POST /api/platform/ecosystem/growth/seo/competitors/declare`
 *
 * Command (no lectura): declara competidores de un target — compromiso de gasto diferido de
 * cobertura. `runEcosystemCommandRoute` aporta idempotencia por `Idempotency-Key` y
 * auditoría de ejecución; el payload rechaza bindings que no sean `internal`.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.competitors.declare',
    body,
    handler: async context =>
      declareEcosystemSeoCompetitorsPayload({
        context,
        request,
        body
      })
  })
}
