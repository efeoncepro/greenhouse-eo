import { NextResponse } from 'next/server'

import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getPayrollEntryExplain } from '@/lib/payroll/payroll-entry-explain'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entryId } = await params
    const explain = await getPayrollEntryExplain(entryId)

    return NextResponse.json(explain)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll entry detail.')
  }
}
