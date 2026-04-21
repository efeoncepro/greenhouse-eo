import { NextResponse } from 'next/server'

import { requestQuotationIssue } from '@/lib/commercial/quotation-issue-command'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import {
  quotationIdentityHasTenantAnchor,
  tenantCanAccessQuotationIdentity
} from '@/lib/finance/pricing/quotation-tenant-access'
import { QuotationFxReadinessError } from '@/lib/finance/quotation-fx-readiness-gate'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const resolveErrorStatus = (message: string) => {
  if (message.includes('not found')) return 404

  if (
    message.includes('ya fue emitida') ||
    message.includes('ya fue convertida') ||
    message.includes('está en aprobación') ||
    message.includes('Estado inválido') ||
    message.includes('expirada')
  ) {
    return 409
  }

  return 400
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  if (!quotationIdentityHasTenantAnchor(identity)) {
    return NextResponse.json(
      { error: 'La cotización no tiene un scope tenant válido.' },
      { status: 409 }
    )
  }

  if (!(await tenantCanAccessQuotationIdentity({ tenant, identity }))) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  try {
    const result = await requestQuotationIssue({
      quotationId: identity.quotationId,
      organizationId: identity.organizationId,
      spaceId: identity.spaceId,
      actor: { userId: tenant.userId, name: tenant.clientName || tenant.userId }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof QuotationFxReadinessError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          severity: error.severity,
          readiness: error.readiness
        },
        { status: error.statusCode }
      )
    }

    const message = error instanceof Error ? error.message : 'No pudimos emitir la cotización.'

    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) })
  }
}
