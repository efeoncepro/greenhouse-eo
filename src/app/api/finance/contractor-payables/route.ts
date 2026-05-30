import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import {
  createContractorPayableFromSubmission,
  createContractorPayableOffCycle,
  listContractorPayables
} from '@/lib/contractor-engagements/payables/store'
import type { ContractorPayableStatus } from '@/lib/contractor-engagements/payables/types'
import { can } from '@/lib/entitlements/runtime'
import { getTenantEntitlementSubject } from '@/lib/entitlements/subject'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const respondError = (error: unknown) => {
  if (error instanceof ContractorEngagementValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code, ...(error.details ?? {}) },
      { status: error.statusCode }
    )
  }

  captureWithDomain(error, 'finance', { tags: { source: 'contractor_payables_api' } })

  return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = await getTenantEntitlementSubject(tenant)

  if (!can(subject, 'finance.contractor_payable', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')

  try {
    const items = await listContractorPayables({
      contractorEngagementId: searchParams.get('engagementId') ?? undefined,
      status: (statusParam as ContractorPayableStatus | null) ?? undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined
    })

    return NextResponse.json({ items })
  } catch (error) {
    return respondError(error)
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = await getTenantEntitlementSubject(tenant)

  if (!can(subject, 'finance.contractor_payable', 'create', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const actorUserId = tenant.userId ?? 'unknown'

  try {
    const body = (await request.json()) as Record<string, unknown>

    if (typeof body.contractorWorkSubmissionId === 'string') {
      const payable = await createContractorPayableFromSubmission({
        contractorWorkSubmissionId: body.contractorWorkSubmissionId,
        dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
        paymentProfileId: typeof body.paymentProfileId === 'string' ? body.paymentProfileId : null,
        actorUserId
      })

      return NextResponse.json({ payable, created: true }, { status: 201 })
    }

    if (typeof body.contractorEngagementId === 'string') {
      const payable = await createContractorPayableOffCycle({
        contractorEngagementId: body.contractorEngagementId,
        grossAmount: Number(body.grossAmount),
        currency: typeof body.currency === 'string' ? body.currency : null,
        paymentCurrency: typeof body.paymentCurrency === 'string' ? body.paymentCurrency : null,
        dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
        paymentProfileId: typeof body.paymentProfileId === 'string' ? body.paymentProfileId : null,
        reason: typeof body.reason === 'string' ? body.reason : '',
        actorUserId
      })

      return NextResponse.json({ payable, created: true }, { status: 201 })
    }

    return NextResponse.json(
      {
        error:
          'Debes enviar contractorWorkSubmissionId (desde submission) o contractorEngagementId + grossAmount + reason (off-cycle).',
        code: 'invalid_payload'
      },
      { status: 400 }
    )
  } catch (error) {
    return respondError(error)
  }
}
