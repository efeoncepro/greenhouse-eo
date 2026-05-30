import { NextResponse } from 'next/server'

import { getContractorPayableById } from '@/lib/contractor-engagements/payables/store'
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
      return NextResponse.json({ error: 'Payable no encontrado.', code: 'payable_not_found' }, { status: 404 })
    }

    return NextResponse.json({ payable })
  } catch (error) {
    captureWithDomain(error, 'finance', { tags: { source: 'contractor_payables_detail_api' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
