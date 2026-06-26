import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getSubmissionLeadMasked } from '@/lib/growth/forms/pii/masked-reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1255 — `GET /api/admin/growth/forms/submissions/[submissionId]/lead` — vista
 * masked-por-default de un lead (email `j***@dominio`, cédula `xx.xxx.NNN-K`). El valor
 * full sólo se obtiene por el reveal gobernado (POST `../reveal`). Capability
 * `growth.forms.submissions.read`. Primitive consumido por cockpit (TASK-1256) / Nexa / MCP.
 */
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ submissionId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.submissions.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.submissions.read' } })
  }

  const { submissionId } = await params

  try {
    const lead = await getSubmissionLeadMasked(submissionId)

    if (!lead) return canonicalErrorResponse('growth_submission_not_found')

    return NextResponse.json({ lead })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_lead_masked', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
