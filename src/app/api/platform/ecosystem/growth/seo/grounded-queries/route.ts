import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import {
  getEcosystemSeoGroundedQueryDraftPayload,
  prepareEcosystemSeoGroundedQueriesPayload
} from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1666 — `GET/POST /api/platform/ecosystem/growth/seo/grounded-queries`
 *
 * GET = draft con provenance SEO. POST = preparar el draft (COMMAND con `Idempotency-Key` vía
 * `runEcosystemCommandRoute`). 🔴 Ambos sólo bindings `internal` (V1 operador). El write queda
 * además FAIL-CLOSED por capability humana (`aeo_forbidden`) hasta TASK-1631 — ver el resource
 * module; se federa igual por paridad con deny canary honesto.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.grounded_queries',
    handler: async context =>
      getEcosystemSeoGroundedQueryDraftPayload({ context, request })
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.grounded_queries.prepare',
    body,
    handler: async context =>
      prepareEcosystemSeoGroundedQueriesPayload({
        context,
        request,
        body
      })
  })
}
