import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { readSerpCompetitorCandidates } from '@/lib/growth/seo/competitor-discovery'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1699 — `GET /api/admin/growth/seo/competitor-candidates?seoTargetId=…`
 *
 * El *propose* del loop de competidores para el operador: candidatos por recurrencia
 * medida, con evidencia y `proposalRef` sugerido. El *execute* es
 * `POST /api/admin/growth/seo/competitors/declare` (TASK-1662), decisión humana.
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
  const rawWindow = Number.parseInt(url.searchParams.get('windowDays') ?? '', 10)
  const rawMinKeywords = Number.parseInt(url.searchParams.get('minKeywords') ?? '', 10)
  const rawMinDays = Number.parseInt(url.searchParams.get('minDays') ?? '', 10)

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  try {
    const result = await readSerpCompetitorCandidates(seoTargetId, {
      ...(Number.isFinite(rawWindow) && rawWindow > 0 ? { windowDays: rawWindow } : {}),
      ...(Number.isFinite(rawMinKeywords) && rawMinKeywords > 0 ? { minKeywords: rawMinKeywords } : {}),
      ...(Number.isFinite(rawMinDays) && rawMinDays > 0 ? { minDays: rawMinDays } : {})
    })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_competitor_candidates_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
