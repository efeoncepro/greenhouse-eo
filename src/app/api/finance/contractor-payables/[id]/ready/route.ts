import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import { transitionPayableToReadyForFinance } from '@/lib/contractor-engagements/payables/store'
import { can } from '@/lib/entitlements/runtime'
import { getTenantEntitlementSubject } from '@/lib/entitlements/subject'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subject = await getTenantEntitlementSubject(tenant)

  if (!can(subject, 'finance.contractor_payable', 'manage', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const payable = await transitionPayableToReadyForFinance({
      contractorPayableId: id,
      actorUserId: tenant.userId ?? 'unknown'
    })

    return NextResponse.json({ payable })
  } catch (error) {
    if (error instanceof ContractorEngagementValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, ...(error.details ?? {}) },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'contractor_payables_ready_api' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
