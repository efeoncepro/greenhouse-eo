import { NextResponse } from 'next/server'

import { generatePayrollExcel } from '@/lib/payroll/generate-payroll-excel'
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
    const buffer = await generatePayrollExcel(periodId)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll-${periodId}.xlsx"`
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate payroll Excel report.')
  }
}
