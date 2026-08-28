import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoKeywordGapPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1662 — `GET /api/platform/ecosystem/growth/seo/keyword-gap`
 *
 * Lectura del gap competitivo DERIVADO (hechos + factores con procedencia; sin orden
 * propio — la cola de TASK-1700 es la autoridad de orden). Sólo bindings `internal` sin
 * organización, con 404 anti-oracle: la comparativa competitiva no se expone al cliente.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_gap',
    handler: context => getEcosystemSeoKeywordGapPayload({ context, request })
  })
}
