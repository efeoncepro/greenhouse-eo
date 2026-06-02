import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import {
  CONTRACTOR_WORK_SUBMISSION_STATUSES,
  CONTRACTOR_WORK_SUBMISSION_TYPES,
  CONTRACTOR_WORK_SUBMISSION_UNITS
} from '@/lib/contractor-engagements/work-submissions'
import { ContractorEngagementValidationError } from '@/lib/contractor-engagements'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import { __clearContractorHrWorkbenchCache } from '@/lib/contractor-engagements/hr-workbench-projection'
import {
  createContractorWorkSubmission,
  listContractorWorkSubmissions
} from '@/lib/contractor-engagements/work-submissions/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isMember = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ContractorEngagementValidationError(
      `El campo ${field} es obligatorio.`,
      'missing_required_field'
    )
  }

  return value.trim()
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_work_submission', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')

    const items = await listContractorWorkSubmissions({
      contractorEngagementId: searchParams.get('contractorEngagementId') ?? undefined,
      status: isMember(CONTRACTOR_WORK_SUBMISSION_STATUSES, statusParam) ? statusParam : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0
    })

    return NextResponse.json({ items })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_work_submissions_api', stage: 'list' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_work_submission', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      throw new ContractorEngagementValidationError(
        'El cuerpo de la solicitud es inválido.',
        'invalid_body'
      )
    }

    if (!isMember(CONTRACTOR_WORK_SUBMISSION_TYPES, body.submissionType)) {
      throw new ContractorEngagementValidationError(
        'submissionType inválido.',
        'invalid_submission_type'
      )
    }

    const submission = await createContractorWorkSubmission({
      contractorEngagementId: requireString(body.contractorEngagementId, 'contractorEngagementId'),
      submissionType: body.submissionType,
      title: typeof body.title === 'string' ? body.title : null,
      servicePeriodStart: typeof body.servicePeriodStart === 'string' ? body.servicePeriodStart : null,
      servicePeriodEnd: typeof body.servicePeriodEnd === 'string' ? body.servicePeriodEnd : null,
      quantity: typeof body.quantity === 'number' ? body.quantity : null,
      unit: isMember(CONTRACTOR_WORK_SUBMISSION_UNITS, body.unit) ? body.unit : null,
      grossAmount: typeof body.grossAmount === 'number' ? body.grossAmount : null,
      currency: typeof body.currency === 'string' ? body.currency : null,
      metadata:
        body.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      actorUserId: tenant.userId
    })

    __clearContractorHrWorkbenchCache()

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    if (!(error instanceof ContractorEngagementValidationError)) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'contractor_work_submissions_api', stage: 'create' }
      })
    }

    return toContractorEngagementErrorResponse(error)
  }
}
