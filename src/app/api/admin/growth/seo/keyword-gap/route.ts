import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { readKeywordGap } from '@/lib/growth/seo/keyword-gap-reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1662 — `GET /api/admin/growth/seo/keyword-gap?seoTargetId=…`
 *
 * Lectura interna (operador Efeonce) del gap competitivo derivado. Capability de
 * observación del módulo; la regla de negocio vive completa en `readKeywordGap`
 * (exclusión GSC, separación content/optimización, factores con `sin_dato`, sin orden
 * propio).
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
  const seoCompetitorId = url.searchParams.get('seoCompetitorId')?.trim() ?? ''
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  try {
    const result = await readKeywordGap(seoTargetId, {
      ...(seoCompetitorId ? { seoCompetitorId } : {}),
      ...(Number.isFinite(rawLimit) && rawLimit > 0 ? { limit: rawLimit } : {})
    })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_keyword_gap_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
