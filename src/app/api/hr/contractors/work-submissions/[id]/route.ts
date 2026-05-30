import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { CONTRACTOR_WORK_SUBMISSION_UNITS } from '@/lib/contractor-engagements/work-submissions'
import { ContractorEngagementValidationError } from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import {
  cancelContractorWorkSubmission,
  getContractorWorkSubmissionById,
  reviewContractorWorkSubmission,
  submitContractorWorkSubmission,
  updateContractorWorkSubmissionDraft
} from '@/lib/contractor-engagements/work-submissions/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_work_submission', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const { id } = await params

  try {
    const submission = await getContractorWorkSubmissionById(id)

    if (!submission) {
      return NextResponse.json(
        { error: 'La work submission no existe.', code: 'work_submission_not_found', actionable: false },
        { status: 404 }
      )
    }

    return NextResponse.json({ submission })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_work_submissions_api', stage: 'get' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)
  const { id } = await params

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError(
        'El cuerpo de la solicitud es inválido.',
        'invalid_body'
      )
    }

    const action = body.action

    // Review (approve/dispute/reject) requires the dedicated review capability.
    if (action === 'approve' || action === 'dispute' || action === 'reject') {
      if (!can(subject, 'hr.contractor_work_submission.review', 'approve', 'tenant')) {
        return canonicalErrorResponse('forbidden')
      }

      const submission = await reviewContractorWorkSubmission({
        contractorWorkSubmissionId: id,
        action,
        reason: typeof body.reason === 'string' ? body.reason : null,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ submission })
    }

    if (action === 'cancel') {
      if (!can(subject, 'hr.contractor_work_submission', 'manage', 'tenant')) {
        return canonicalErrorResponse('forbidden')
      }

      const submission = await cancelContractorWorkSubmission({
        contractorWorkSubmissionId: id,
        reason: typeof body.reason === 'string' ? body.reason : null,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ submission })
    }

    // submit + update draft require the base update capability.
    if (!can(subject, 'hr.contractor_work_submission', 'update', 'tenant')) {
      return canonicalErrorResponse('forbidden')
    }

    if (action === 'submit') {
      const submission = await submitContractorWorkSubmission({
        contractorWorkSubmissionId: id,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ submission })
    }

    if (action === 'update' || action === undefined) {
      const submission = await updateContractorWorkSubmissionDraft({
        contractorWorkSubmissionId: id,
        title: typeof body.title === 'string' ? body.title : undefined,
        servicePeriodStart:
          typeof body.servicePeriodStart === 'string' ? body.servicePeriodStart : undefined,
        servicePeriodEnd:
          typeof body.servicePeriodEnd === 'string' ? body.servicePeriodEnd : undefined,
        quantity: typeof body.quantity === 'number' ? body.quantity : undefined,
        unit: isMember(CONTRACTOR_WORK_SUBMISSION_UNITS, body.unit) ? body.unit : undefined,
        grossAmount: typeof body.grossAmount === 'number' ? body.grossAmount : undefined,
        currency: typeof body.currency === 'string' ? body.currency : undefined,
        metadataPatch:
          body.metadataPatch && typeof body.metadataPatch === 'object'
            ? (body.metadataPatch as Record<string, unknown>)
            : undefined,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ submission })
    }

    throw new ContractorEngagementValidationError(
      `Acción no soportada: ${String(action)}.`,
      'unsupported_action'
    )
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_work_submissions_api', stage: 'patch' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
