import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { trackKeywords } from '@/lib/growth/seo/track-keywords'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1308 — `POST /api/admin/growth/seo/keywords/track`
 *
 * Contrato programático de "Seguir una keyword" (Full API Parity): la UI operador es UN
 * cliente de esta ruta, no su dueña. Acá sólo vive el plano de transporte — tenant,
 * capability y error contract; toda la regla de negocio (techo de gasto diferido,
 * idempotencia, normalización, entitlement per-org, outbox) vive en el primitive
 * `trackKeywords`, para que Nexa y el lane MCP obtengan exactamente el mismo comportamiento
 * sin reimplementar nada.
 *
 * ⚠️ La capability es `growth.seo.target.configure` (execute), NO `observation.read`: ver el
 * mapa de oportunidades y comprometer gasto recurrente del cliente son dos permisos
 * distintos. Un analista puede leer sin poder hacer crecer la factura.
 */

export const dynamic = 'force-dynamic'

interface TrackKeywordsBody {
  seoTargetId?: unknown
  keywords?: unknown
}

/** El contrato del primitive se traduce 1:1 a códigos canónicos: sin prosa inventada acá. */
const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  target_not_active: 'seo_target_not_active',
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

  let body: TrackKeywordsBody

  try {
    body = (await request.json()) as TrackKeywordsBody
  } catch {
    return canonicalErrorResponse('seo_keywords_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const seoTargetId = typeof body.seoTargetId === 'string' ? body.seoTargetId.trim() : ''
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((item): item is string => typeof item === 'string') : []

  if (!seoTargetId || keywords.length === 0) {
    return canonicalErrorResponse('seo_keywords_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId', 'keywords'] }
    })
  }

  try {
    const result = await trackKeywords(seoTargetId, keywords, tenant.userId, { source: 'operator_ui' })

    if (!result.ok) {
      const code = ERROR_CODE_MAP[result.errorCode] ?? 'internal_error'

      return canonicalErrorResponse(code, { extra: { seoTargetId } })
    }

    // 200 siempre que el command resolvió: un lote con keywords rebotadas por techo NO es un
    // error de transporte — es un resultado que el cliente tiene que leer keyword por
    // keyword. Devolver 4xx acá haría que la UI mostrara "falló" cuando agregó 5 de 8.
    return NextResponse.json({
      seoTargetId: result.seoTargetId,
      keywordSetId: result.keywordSetId,
      outcomes: result.outcomes,
      activeKeywordCount: result.activeKeywordCount,
      capacity: result.capacity
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_track_keywords_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
