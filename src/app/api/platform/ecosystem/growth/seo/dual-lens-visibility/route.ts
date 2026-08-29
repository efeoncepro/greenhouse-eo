import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoDualLensVisibilityPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1785 — `GET /api/platform/ecosystem/growth/seo/dual-lens-visibility`
 *
 * Las dos lentes de posición del mismo set de keywords, separadas y rotuladas. Convive con
 * `get_seo_visibility_360`, que cruza otra cosa (SEO × AEO, dos ejes ortogonales); ésta cruza
 * medido × estimado DENTRO de SEO. No se reemplazan.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.dual_lens_visibility',
    handler: context => getEcosystemSeoDualLensVisibilityPayload({ context, request })
  })
}
