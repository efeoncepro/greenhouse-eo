import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { retireCompetitors } from '@/lib/growth/seo/competitors'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1662 — `POST /api/admin/growth/seo/competitors/retire`
 *
 * El reverso de `declare`: cierra la vigencia del competidor (append-only, la cobertura ya
 * capturada queda como histórico) y con eso corta su gasto de cobertura del próximo ciclo.
 * Misma capability que el alta: quien puede subir el gasto puede bajarlo.
 */

export const dynamic = 'force-dynamic'

interface RetireCompetitorsBody {
  seoTargetId?: unknown
  domains?: unknown
  reason?: unknown
}

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  no_entitlement: 'seo_not_entitled',
  no_domains: 'seo_competitors_invalid_input',
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

  let body: RetireCompetitorsBody

  try {
    body = (await request.json()) as RetireCompetitorsBody
  } catch {
    return canonicalErrorResponse('seo_competitors_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const seoTargetId = typeof body.seoTargetId === 'string' ? body.seoTargetId.trim() : ''

  const domains = Array.isArray(body.domains)
    ? body.domains.filter((item): item is string => typeof item === 'string')
    : []

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!seoTargetId || domains.length === 0) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId', 'domains'] }
    })
  }

  try {
    const result = await retireCompetitors(seoTargetId, domains, tenant.userId, {
      ...(reason ? { reason } : {})
    })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    return NextResponse.json({
      seoTargetId: result.seoTargetId,
      outcomes: result.outcomes,
      activeCompetitorCount: result.activeCompetitorCount,
      capacity: result.capacity
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_retire_competitors_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
