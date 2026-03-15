import { NextResponse } from 'next/server'

import { getPersonnelExpenseReport } from '@/lib/payroll/personnel-expense'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const yearFrom = Number(searchParams.get('yearFrom')) || now.getFullYear()
    const monthFrom = Number(searchParams.get('monthFrom')) || 1
    const yearTo = Number(searchParams.get('yearTo')) || now.getFullYear()
    const monthTo = Number(searchParams.get('monthTo')) || now.getMonth() + 1

    const report = await getPersonnelExpenseReport(yearFrom, monthFrom, yearTo, monthTo)

    return NextResponse.json(report)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate personnel expense report.')
  }
}
