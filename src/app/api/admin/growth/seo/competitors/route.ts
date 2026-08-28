import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { listActiveCompetitors, resolveCompetitorCapacity } from '@/lib/growth/seo/competitors'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1662 — `GET /api/admin/growth/seo/competitors?seoTargetId=…`
 *
 * Lista los competidores VIGENTES declarados de un target, con su autoría. ⚠️ El listado de
 * competidores de un cliente es información comercial sensible (auditoría §7): esta ruta es
 * interna (operador Efeonce) y la capability de lectura del módulo la gobierna.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.observation.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.observation.read' }
    })
  }

  if (!isSeoModuleEnabled()) {
    return canonicalErrorResponse('seo_module_disabled')
  }

  const url = new URL(request.url)
  const seoTargetId = url.searchParams.get('seoTargetId')?.trim() ?? ''

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  try {
    const competitors = await listActiveCompetitors(seoTargetId)

    return NextResponse.json({
      seoTargetId,
      competitors,
      activeCompetitorCount: competitors.length,
      capacity: resolveCompetitorCapacity()
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_competitors_list_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
