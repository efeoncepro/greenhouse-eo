import { NextResponse } from 'next/server'

import { generatePayrollReceiptPdf } from '@/lib/payroll/generate-payroll-pdf'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entryId } = await params
    const buffer = await generatePayrollReceiptPdf(entryId)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${entryId}.pdf"`
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate payroll receipt.')
  }
}
