import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import { overridePayableAgreedAmount } from '@/lib/contractor-engagements/payables/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-968 — Governed override of the agreed-amount guardrail.
 *
 * Capability `finance.contractor_payable.override_agreed_amount` (admin-only) is
 * deliberately DISTINCT from the HR capability that SETS the amount
 * (`hr.contractor_engagement`): SoD — HR fija el monto, Finance no lo supera sin override.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.contractor_payable.override_agreed_amount', 'update', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>

    const payable = await overridePayableAgreedAmount({
      contractorPayableId: id,
      reason: typeof body.reason === 'string' ? body.reason : '',
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

    captureWithDomain(error, 'finance', {
      tags: { source: 'contractor_payables_override_agreed_amount_api' }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
