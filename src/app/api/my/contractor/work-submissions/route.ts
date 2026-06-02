import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import {
  clearContractorSelfServiceCacheForProfile,
  getActiveContractorEngagementForProfile
} from '@/lib/contractor-engagements/self-service-projection'
import { __clearContractorHrWorkbenchCache } from '@/lib/contractor-engagements/hr-workbench-projection'
import {
  CONTRACTOR_WORK_SUBMISSION_TYPES,
  CONTRACTOR_WORK_SUBMISSION_UNITS
} from '@/lib/contractor-engagements/work-submissions'
import {
  createContractorWorkSubmission,
  submitContractorWorkSubmission
} from '@/lib/contractor-engagements/work-submissions/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-796 — `/api/my/contractor/work-submissions` (self-service, member-scoped).
 *
 * POST → the contractor creates a work submission (timesheet/milestone/deliverable)
 *        against THEIR OWN active engagement and optionally submits it for review.
 *
 * The engagement is resolved server-side from the session's identityProfileId —
 * the client NEVER passes a contractorEngagementId (no IDOR). Approval/dispute/
 * reject stays an HR surface (hr.contractor_work_submission.review).
 *
 * Body: { submissionType, title?, servicePeriodStart?, servicePeriodEnd?, quantity?,
 *         unit?, grossAmount?, currency?, submit? }
 */

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

const optionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const SUBMITTABLE_STATUSES = new Set(['active', 'ending'])

export async function POST(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.contractor.submit_self', 'create', 'own')) {
    return NextResponse.json(
      { error: 'No tienes acceso para enviar trabajo como contractor.', code: 'forbidden', actionable: false },
      { status: 403 }
    )
  }

  const identityProfileId = tenant.identityProfileId

  if (!identityProfileId) {
    return NextResponse.json(
      {
        error: 'Tu cuenta aún no está enlazada a un perfil canónico. Pídele a People Ops que active tu identidad.',
        code: 'identity_profile_missing',
        actionable: false
      },
      { status: 422 }
    )
  }

  let body: Record<string, unknown> = {}

  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const engagement = await getActiveContractorEngagementForProfile(identityProfileId)

    if (!engagement) {
      throw new ContractorEngagementValidationError(
        'No tienes un engagement contractor activo para enviar trabajo.',
        'no_active_engagement',
        422
      )
    }

    if (!SUBMITTABLE_STATUSES.has(engagement.status)) {
      throw new ContractorEngagementValidationError(
        'El engagement no admite nuevos envíos en su estado actual.',
        'engagement_not_submittable',
        422
      )
    }

    if (!isMember(CONTRACTOR_WORK_SUBMISSION_TYPES, body.submissionType)) {
      throw new ContractorEngagementValidationError(
        'El tipo de envío es obligatorio y debe ser válido.',
        'invalid_submission_type'
      )
    }

    const unit = body.unit
    const unitValue = unit === undefined || unit === null ? null : isMember(CONTRACTOR_WORK_SUBMISSION_UNITS, unit) ? unit : undefined

    if (unitValue === undefined) {
      throw new ContractorEngagementValidationError('La unidad del envío no es válida.', 'invalid_submission_unit')
    }

    const created = await createContractorWorkSubmission({
      contractorEngagementId: engagement.contractorEngagementId,
      submissionType: body.submissionType,
      title: optionalString(body.title),
      servicePeriodStart: optionalString(body.servicePeriodStart),
      servicePeriodEnd: optionalString(body.servicePeriodEnd),
      quantity: optionalNumber(body.quantity),
      unit: unitValue,
      grossAmount: optionalNumber(body.grossAmount),
      currency: optionalString(body.currency) ?? engagement.currency,
      actorUserId: tenant.userId
    })

    const submission =
      body.submit === true
        ? await submitContractorWorkSubmission({
            contractorWorkSubmissionId: created.contractorWorkSubmissionId,
            actorUserId: tenant.userId
          })
        : created

    clearContractorSelfServiceCacheForProfile(identityProfileId)
    __clearContractorHrWorkbenchCache()

    return NextResponse.json({ submission, created: true }, { status: 201 })
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'my_contractor_work_submissions', stage: 'POST' },
        extra: { memberId }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
