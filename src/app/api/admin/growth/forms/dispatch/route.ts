import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { dispatchPendingSubmissions } from '@/lib/growth/forms/dispatch'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `POST /api/admin/growth/forms/dispatch` — drena submissions pendientes
 * de entrega (corre el adapter fake/echo, registra attempts, transiciona estados).
 * Capability `growth.forms.retry_delivery`.
 *
 * Trigger interno/manual + harness de tests. El path PRODUCTIVO canónico es el
 * ops-worker drain `POST /growth/forms/dispatch` vía Cloud Scheduler (espejo del
 * grader drain TASK-1234) — ROLLOUT PENDIENTE: este endpoint NO reemplaza ese job,
 * lo hace operable/testeable mientras se despliega el scheduler.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.retry_delivery', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.retry_delivery' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit'))

    const summary = await dispatchPendingSubmissions(
      Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    )

    return NextResponse.json(summary)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_dispatch', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
