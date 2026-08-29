import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { WORK_QUEUE_ORIGINS, type SeoWorkQueueOrigin } from '@/lib/growth/seo/work-queue/contracts'
import { readSeoWorkQueue } from '@/lib/growth/seo/work-queue/reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1700 — `GET /api/admin/growth/seo/work-queue?seoTargetId=…`
 *
 * Lectura interna (operador Efeonce) de la cola priorizada. La regla de negocio vive completa
 * en `readSeoWorkQueue`: orden, bandas, frescura y salud de orígenes. Esta ruta no reordena
 * ni recalcula nada — si lo hiciera, sería un quinto criterio de orden, que es exactamente el
 * problema que la cola existe para cerrar.
 *
 * ⚠️ Un origen caído NO es un error de la ruta: es un `200` con `originHealth` degradado. Un
 * 500 acá borraría el plan del día entero por un motor ajeno.
 */

export const dynamic = 'force-dynamic'

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
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

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_work_queue_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  // Un origen fuera del vocabulario cerrado se IGNORA en vez de rechazar la lectura entera:
  // el vocabulario crece por migración y un consumer viejo no debe quedarse sin cola por
  // mandar un nombre que todavía no conoce.
  const rawOrigins = url.searchParams.getAll('origin')

  const origins = rawOrigins.filter((value): value is SeoWorkQueueOrigin =>
    (WORK_QUEUE_ORIGINS as readonly string[]).includes(value)
  )

  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
  const cursor = url.searchParams.get('cursor')?.trim() || null

  try {
    const result = await readSeoWorkQueue(seoTargetId, {
      ...(origins.length > 0 ? { origins } : {}),
      ...(Number.isFinite(rawLimit) && rawLimit > 0 ? { limit: rawLimit } : {}),
      cursor
    })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: { seoTargetId }
      })
    }

    return NextResponse.json({
      ...result,
      ignoredOrigins: rawOrigins.filter(value => !(origins as readonly string[]).includes(value))
    })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_work_queue_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
