import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { requestEcosystemBrandRenderPayload } from '@/lib/api-platform/resources/ecosystem-brand-render'
import { listEcosystemBrandRenderRequestsPayload } from '@/lib/api-platform/resources/ecosystem-brand-render-read'

export const dynamic = 'force-dynamic'

/** TASK-1921 — pide el render de una pieza de marca desde un binding interno (gateway MCP / Nexa). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({ request, routeKey: 'platform.ecosystem.brand_render.requests.create', body, handler: async context => requestEcosystemBrandRenderPayload({ context, body }) })
}

/** TASK-1921 — pedidos recientes de la marca con el estado de cada job y sus salidas. */
export async function GET(request: Request) {
  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.brand_render.requests.list', handler: async context => listEcosystemBrandRenderRequestsPayload({ context, request }) })
}
