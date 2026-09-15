import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { createEcosystemInsightEditionPayload, listEcosystemInsightEditionsPayload } from '@/lib/api-platform/resources/ecosystem-insights'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.insights.editions.list', handler: async context => listEcosystemInsightEditionsPayload({ context, request }) })
}

/** COMMAND: idempotencia por `Idempotency-Key` + auditoría de ejecución del lane, además de la
 *  idempotencia de dominio por `idempotencyKey` del encargo. Sólo bindings `internal`. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.insights.editions.create', body, handler: async context => createEcosystemInsightEditionPayload({ context, request, body }) })
}
