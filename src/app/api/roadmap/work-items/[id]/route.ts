import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * Roadmap work item Markdown lookup deshabilitado.
 *
 * El endpoint conserva auth/capability para no abrir metadata interna, pero ya
 * no importa el reader filesystem que arrastraba `docs/**` al build.
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'roadmap.work_items.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'roadmap.work_items.read' }
    })
  }

  return canonicalErrorResponse('roadmap_disabled')
}
