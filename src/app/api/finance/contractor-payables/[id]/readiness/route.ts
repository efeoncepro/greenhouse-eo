import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import {
  assessPayableReadiness,
  getContractorPayableById
} from '@/lib/contractor-engagements/payables/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.contractor_payable', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const payable = await getContractorPayableById(id)

    if (!payable) {
      return NextResponse.json({ error: 'El payable no existe.', code: 'payable_not_found' }, { status: 404 })
    }

    const readiness = await assessPayableReadiness(payable)

    return NextResponse.json({ readiness })
  } catch (error) {
    if (error instanceof ContractorEngagementValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, ...(error.details ?? {}) },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'contractor_payables_readiness_api' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
