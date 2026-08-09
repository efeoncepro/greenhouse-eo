import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { untrackKeywords } from '@/lib/growth/seo/track-keywords'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1308 — `POST /api/admin/growth/seo/keywords/untrack`
 *
 * La contraparte de `track`, y la que hace REVERSIBLE el compromiso de gasto: sin ella,
 * seguir una keyword la dejaba en el ciclo de facturación del proveedor para siempre.
 *
 * Misma capability que el alta (`growth.seo.target.configure`): quien puede hacer crecer la
 * factura puede bajarla. Separarlas dejaría a alguien capaz de comprometer gasto sin poder
 * revertirlo, que es la peor combinación de los dos permisos.
 */

export const dynamic = 'force-dynamic'

interface UntrackKeywordsBody {
  seoTargetId?: unknown
  keywords?: unknown
}

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  no_entitlement: 'seo_not_entitled',
  no_keywords: 'seo_keywords_invalid_input',
  query_failed: 'internal_error'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.target.configure', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.target.configure' }
    })
  }

  let body: UntrackKeywordsBody

  try {
    body = (await request.json()) as UntrackKeywordsBody
  } catch {
    return canonicalErrorResponse('seo_keywords_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const seoTargetId = typeof body.seoTargetId === 'string' ? body.seoTargetId.trim() : ''

  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter((item): item is string => typeof item === 'string')
    : []

  if (!seoTargetId || keywords.length === 0) {
    return canonicalErrorResponse('seo_keywords_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId', 'keywords'] }
    })
  }

  try {
    const result = await untrackKeywords(seoTargetId, keywords, tenant.userId)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', { extra: { seoTargetId } })
    }

    return NextResponse.json({
      seoTargetId: result.seoTargetId,
      outcomes: result.outcomes,
      activeKeywordCount: result.activeKeywordCount,
      capacity: result.capacity
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_untrack_keywords_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
