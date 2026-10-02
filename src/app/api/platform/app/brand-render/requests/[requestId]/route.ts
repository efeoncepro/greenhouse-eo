import { runAppReadRoute } from '@/lib/api-platform/core/app-auth'
import { getAppBrandRenderRequest } from '@/lib/api-platform/resources/app-brand-render-read'

export const dynamic = 'force-dynamic'

/** TASK-1921 — estado de un pedido de render de marca y el enlace de descarga de cada salida lista. */
export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params

  return runAppReadRoute({ request, routeKey: 'platform.app.brand_render.requests.get', handler: async context => getAppBrandRenderRequest({ context, requestId }) })
}
