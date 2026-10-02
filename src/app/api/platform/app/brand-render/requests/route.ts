import { runAppCommandRoute, runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { requestAppBrandRender } from '@/lib/api-platform/resources/app-brand-render'
import { listAppBrandRenderRequests } from '@/lib/api-platform/resources/app-brand-render-read'

export const dynamic = 'force-dynamic'

/** TASK-1921 — pide el render de una pieza de marca (202) o devuelve el pedido idéntico que ya existía (200). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined)

  return runAppCommandRoute({ request, routeKey: 'platform.app.brand_render.requests.create', body, handler: async context => requestAppBrandRender({ context, body }) })
}

/** TASK-1921 — pedidos recientes de la marca, con el estado de cada job y sus salidas. */
export async function GET(request: Request) {
  return runAppReadRoute({ request, routeKey: 'platform.app.brand_render.requests.list', handler: async context => listAppBrandRenderRequests({ context, request }) })
}
