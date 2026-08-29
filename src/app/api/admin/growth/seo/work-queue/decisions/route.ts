import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { WORK_QUEUE_DECISIONS, type SeoWorkQueueDecision } from '@/lib/growth/seo/work-queue/contracts'
import { recordSeoWorkQueueDecision } from '@/lib/growth/seo/work-queue/record-decision'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1700 — `POST /api/admin/growth/seo/work-queue/decisions`
 *
 * 🔴 Es el punto de CONFIRMACIÓN HUMANA del loop `propose → confirm → execute`. Nexa (o
 * cualquier agente) puede proponer una decisión; sólo este endpoint muta, y sólo con una
 * sesión humana con la capability. El LLM no escribe.
 *
 * ⚠️ VER Y DECIDIR SON DOS PERMISOS. `growth.seo.observation.read` abre la cola;
 * `growth.seo.work_queue.decide` habilita descartar o aceptar. Un analista puede leer el
 * plan completo sin poder retirarle trabajo al equipo.
 */

export const dynamic = 'force-dynamic'

const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  invalid_input: 'seo_work_queue_invalid_input',
  item_not_found: 'seo_work_queue_item_not_found',
  query_failed: 'internal_error'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.work_queue.decide', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.work_queue.decide' }
    })
  }

  let body: { itemId?: unknown; decision?: unknown; note?: unknown }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return canonicalErrorResponse('seo_work_queue_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : ''
  const decision = typeof body.decision === 'string' ? body.decision : ''

  if (!itemId || !WORK_QUEUE_DECISIONS.includes(decision as SeoWorkQueueDecision)) {
    return canonicalErrorResponse('seo_work_queue_invalid_input', {
      extra: { reason: 'missing_or_invalid_fields', allowedDecisions: WORK_QUEUE_DECISIONS }
    })
  }

  try {
    const result = await recordSeoWorkQueueDecision({
      itemId,
      decision: decision as SeoWorkQueueDecision,
      // El actor es la SESIÓN, jamás un campo del body: un actor del request permitiría
      // firmar la decisión con el nombre de otra persona.
      actor: tenant.userId,
      ...(typeof body.note === 'string' && body.note.trim() ? { note: body.note.trim() } : {})
    })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', { extra: { itemId } })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_work_queue_decisions_route' },
      extra: { itemId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
