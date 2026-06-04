import { NextResponse } from 'next/server'

import { listContractorPaymentReadySubmissionsForWorkbench } from '@/lib/finance/contractor-payments/workbench-reader'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.contractor_payable', 'create', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  try {
    const items = await listContractorPaymentReadySubmissionsForWorkbench({
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined
    })

    return NextResponse.json({ items })
  } catch (error) {
    captureWithDomain(error, 'finance', { tags: { source: 'contractor_ready_submissions_api' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
