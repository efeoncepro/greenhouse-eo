import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { isCtaEngineEnabled } from '@/lib/growth/ctas/flags'
import { getCtaDetailAdmin } from '@/lib/growth/ctas/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1339 — `GET /api/admin/growth/ctas/{ctaId}` (detalle + versiones + resumen
 * de conversión; SOLO server_confirmed cuenta como conversión en reportes).
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ ctaId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!isCtaEngineEnabled()) return canonicalErrorResponse('growth_cta_engine_disabled')

  if (!can(tenant, 'growth.cta.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.read' } })
  }

  const { ctaId } = await params

  try {
    const detail = await getCtaDetailAdmin(ctaId)

    if (!detail) return canonicalErrorResponse('growth_cta_not_found')

    return NextResponse.json(detail)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_detail', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
