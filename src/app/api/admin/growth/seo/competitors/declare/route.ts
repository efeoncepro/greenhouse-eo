import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { declareCompetitors } from '@/lib/growth/seo/competitors'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1662 — `POST /api/admin/growth/seo/competitors/declare`
 *
 * Contrato programático de "declarar un competidor" (Full API Parity): la UI es UN cliente
 * de esta ruta, no su dueña. Toda la regla de negocio (autoría obligatoria, techo de gasto
 * diferido, idempotencia, normalización, outbox) vive en el primitive `declareCompetitors`.
 *
 * ⚠️ Capability `growth.seo.target.configure` (execute), NO `observation.read`: declarar un
 * competidor compromete gasto de cobertura recurrente — mismo plano que seguir keywords.
 * La declaración es HUMANA: la propuesta puede venir de una máquina y viaja en
 * `proposalRef` opaca, pero quien llama esta ruta es quien asume la clasificación.
 */

export const dynamic = 'force-dynamic'

interface DeclareCompetitorsBody {
  seoTargetId?: unknown
  domains?: unknown
  proposalRef?: unknown
}

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  target_not_active: 'seo_target_not_active',
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

  let body: DeclareCompetitorsBody

  try {
    body = (await request.json()) as DeclareCompetitorsBody
  } catch {
    return canonicalErrorResponse('seo_competitors_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const seoTargetId = typeof body.seoTargetId === 'string' ? body.seoTargetId.trim() : ''

  const domains = Array.isArray(body.domains)
    ? body.domains.filter((item): item is string => typeof item === 'string')
    : []

  const proposalRef = typeof body.proposalRef === 'string' ? body.proposalRef.trim() : ''

  if (!seoTargetId || domains.length === 0) {
    return canonicalErrorResponse('seo_competitors_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId', 'domains'] }
    })
  }

  try {
    const result = await declareCompetitors(seoTargetId, domains, tenant.userId, {
      source: 'operator_ui',
      ...(proposalRef ? { proposalRef } : {})
    })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    // 200 siempre que el command resolvió: un lote con dominios rebotados por techo NO es un
    // error de transporte — es un resultado que se lee dominio por dominio.
    return NextResponse.json({
      seoTargetId: result.seoTargetId,
      outcomes: result.outcomes,
      activeCompetitorCount: result.activeCompetitorCount,
      capacity: result.capacity
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_declare_competitors_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
