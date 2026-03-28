import { NextResponse } from 'next/server'

import { getPayrollExportArtifact } from '@/lib/payroll/payroll-export-packages'
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
    const artifact = await getPayrollExportArtifact(periodId, 'pdf')

    return new NextResponse(new Uint8Array(artifact.buffer), {
      headers: {
        'Content-Type': artifact.contentType,
        'Content-Disposition': `attachment; filename="${artifact.filename}"`
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate payroll PDF report.')
  }
}
