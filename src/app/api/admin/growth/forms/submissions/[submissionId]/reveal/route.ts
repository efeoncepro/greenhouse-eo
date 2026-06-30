import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { GrowthFormsPiiError } from '@/lib/growth/forms/pii/errors'
import { revealSubmissionPiiField } from '@/lib/growth/forms/pii/reveal'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1255 — `POST /api/admin/growth/forms/submissions/[submissionId]/reveal` — reveal
 * gobernado de UN campo PII de un lead (cédula/email/teléfono). Capability fina
 * `growth.forms.lead_pii.reveal` (NO el read masked) + reason ≥ 10 + audit append-only +
 * outbox. Primitive consumido por cockpit (TASK-1256) / Nexa / MCP con la MISMA capability.
 *
 * Body: { fieldKey: string, reason: string (≥ 10 chars) }
 * Response: { fieldKey, piiClass, value, auditId, eventId }
 */
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ submissionId: string }>
}

const REVEAL_REASON_BY_PII_ERROR = {
  submission_not_found: 'growth_submission_not_found',
  field_not_revealable: 'growth_lead_field_not_revealable',
  reason_required: 'growth_lead_reveal_reason_required',
} as const

export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.lead_pii.reveal', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.lead_pii.reveal' } })
  }

  const { submissionId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) ?? {}
  } catch {
    body = {}
  }

  if (typeof body.fieldKey !== 'string' || body.fieldKey.trim() === '') {
    return canonicalErrorResponse('growth_lead_field_not_revealable')
  }

  if (typeof body.reason !== 'string') {
    return canonicalErrorResponse('growth_lead_reveal_reason_required')
  }

  const session = await getServerAuthSession()
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  try {
    const result = await revealSubmissionPiiField({
      submissionId,
      fieldKey: body.fieldKey,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email ?? null,
      reason: body.reason,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GrowthFormsPiiError) {
      const code = REVEAL_REASON_BY_PII_ERROR[error.reason as keyof typeof REVEAL_REASON_BY_PII_ERROR]

      if (code) return canonicalErrorResponse(code)

      return canonicalErrorResponse('internal_error', { statusOverride: error.statusCode })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_lead_reveal', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
