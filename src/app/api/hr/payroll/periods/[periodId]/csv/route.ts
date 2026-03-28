import { NextResponse } from 'next/server'

import { generatePayrollCsv } from '@/lib/payroll/export-payroll'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const csv = await generatePayrollCsv(periodId)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-${periodId}.csv"`
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to download payroll CSV.')
  }
}
