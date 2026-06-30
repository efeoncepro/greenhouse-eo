import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { listSubmissionsAdmin } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `GET /api/admin/growth/forms/submissions` — submissions del motor +
 * estado de entrega (sin PII cruda; el email vive hasheado). Capability
 * `growth.forms.submissions.read`.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.submissions.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.submissions.read' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get('formId') ?? undefined
    const limitRaw = Number(searchParams.get('limit'))

    const items = await listSubmissionsAdmin({
      formId,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_submissions', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
