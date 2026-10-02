import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemBrandRenderRequestPayload } from '@/lib/api-platform/resources/ecosystem-brand-render-read'

export const dynamic = 'force-dynamic'

/** TASK-1921 — un pedido de render de marca: estado por job y enlaces de descarga de las salidas listas. */
export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params

  return runEcosystemReadRoute({ request, routeKey: 'platform.ecosystem.brand_render.requests.get', handler: async context => getEcosystemBrandRenderRequestPayload({ context, requestId }) })
}
