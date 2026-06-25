import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getFormDetailAdmin } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `GET /api/admin/growth/forms/{formId}` — detalle (definition +
 * versiones + destinations). Capability `growth.forms.read`.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.read' } })
  }

  const { formId } = await params

  try {
    const detail = await getFormDetailAdmin(formId)

    if (!detail) return canonicalErrorResponse('growth_form_not_found')

    return NextResponse.json(detail)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_detail', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
