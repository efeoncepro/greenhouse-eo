import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoWorkQueuePayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1700 — `GET /api/platform/ecosystem/growth/seo/work-queue`
 *
 * La cola priorizada de trabajo: la ÚNICA autoridad de orden del módulo. Sólo bindings
 * `internal` sin organización, con 404 anti-oracle — la cola lleva lente competitiva y el
 * cruce con citabilidad IA, que no se exponen al cliente.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.work_queue',
    handler: context => getEcosystemSeoWorkQueuePayload({ context, request })
  })
}
