import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { readSerpTopResults } from '@/lib/growth/seo/competitor-discovery'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1699 — `GET /api/admin/growth/seo/serp-top-results?seoTargetId=…`
 *
 * Lectura interna (operador Efeonce) de la serie del top-N del SERP ya pagado.
 * Capability de observación del módulo; la regla vive en `readSerpTopResults`.
 */

export const dynamic = 'force-dynamic'

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  no_entitlement: 'seo_not_entitled',
  query_failed: 'internal_error'
}

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

  const url = new URL(request.url)
  const seoTargetId = url.searchParams.get('seoTargetId')?.trim() ?? ''
  const keyword = url.searchParams.get('keyword')?.trim() ?? ''
  const from = url.searchParams.get('from')?.trim() ?? ''
  const to = url.searchParams.get('to')?.trim() ?? ''
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  try {
    const result = await readSerpTopResults(seoTargetId, {
      ...(keyword ? { keyword } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(Number.isFinite(rawLimit) && rawLimit > 0 ? { limit: rawLimit } : {})
    })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_serp_top_results_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
